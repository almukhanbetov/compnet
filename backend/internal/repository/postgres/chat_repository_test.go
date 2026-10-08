package postgres

import (
	"context"
	"errors"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/almukha/compnet-backend/internal/domain/chat"
	"github.com/almukha/compnet-backend/internal/security"
)

// Integration tests: they run only when TEST_DATABASE_URL points at a
// throwaway, fully migrated database, e.g.
//
//	TEST_DATABASE_URL=postgres://...:5452/compnet_test?sslmode=disable go test ./internal/repository/...
func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping PostgreSQL integration test")
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func newTestConversation(t *testing.T, repo *ChatRepository, clientID, body string) (chat.Conversation, chat.Message, []byte) {
	t.Helper()
	_, hash, err := security.NewToken()
	if err != nil {
		t.Fatal(err)
	}
	conv, err := repo.Create(context.Background(), chat.Conversation{VisitorTokenHash: hash, PageURL: "https://compnet.kz/"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = repo.pool.Exec(context.Background(), `DELETE FROM chat_conversations WHERE id = $1`, conv.ID)
	})
	if conv.LastMessageAt != nil {
		t.Fatal("new conversation must have no last_message_at")
	}
	msg, created, err := repo.AddMessage(context.Background(), conv.ID,
		chat.Message{Author: chat.AuthorVisitor, ClientMessageID: clientID, Body: body})
	if err != nil || !created {
		t.Fatalf("first message: created=%v err=%v", created, err)
	}
	return conv, msg, hash
}

func TestChatRepository_Integration(t *testing.T) {
	pool := testPool(t)
	repo := NewChatRepository(pool)
	ctx := context.Background()

	convA, msgA, hashA := newTestConversation(t, repo, "aaaaaaaa-0000-4000-8000-000000000001", "hello from A")
	convB, _, hashB := newTestConversation(t, repo, "bbbbbbbb-0000-4000-8000-000000000001", "hello from B")

	t.Run("find by token hash", func(t *testing.T) {
		got, err := repo.FindByTokenHash(ctx, hashA)
		if err != nil || got.ID != convA.ID || got.LastMessageID != msgA.ID || got.UnreadForVisitor != 0 || got.LastMessageAt == nil {
			t.Fatalf("got %+v err %v", got, err)
		}
		_, unknown, _ := security.NewToken()
		if _, err := repo.FindByTokenHash(ctx, unknown); !errors.Is(err, chat.ErrNotFound) {
			t.Fatalf("unknown hash: %v", err)
		}
	})

	t.Run("concurrent duplicate client id stores one row", func(t *testing.T) {
		const clientID = "aaaaaaaa-0000-4000-8000-000000000002"
		var (
			wg      sync.WaitGroup
			mu      sync.Mutex
			created int
			ids     = map[int64]bool{}
		)
		for i := 0; i < 8; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				m, c, err := repo.AddMessage(ctx, convA.ID, chat.Message{Author: chat.AuthorVisitor, ClientMessageID: clientID, Body: "retry"})
				if err != nil {
					t.Error(err)
					return
				}
				mu.Lock()
				defer mu.Unlock()
				ids[m.ID] = true
				if c {
					created++
				}
			}()
		}
		wg.Wait()
		if created != 1 || len(ids) != 1 {
			t.Fatalf("created=%d distinct ids=%d, want 1/1", created, len(ids))
		}
	})

	t.Run("same client id in another conversation is independent", func(t *testing.T) {
		_, c, err := repo.AddMessage(ctx, convB.ID, chat.Message{Author: chat.AuthorVisitor, ClientMessageID: "aaaaaaaa-0000-4000-8000-000000000002", Body: "retry"})
		if err != nil || !c {
			t.Fatalf("created=%v err=%v", c, err)
		}
	})

	t.Run("messages are scoped to their conversation", func(t *testing.T) {
		items, err := repo.ListMessages(ctx, convB.ID, 0, 100)
		if err != nil {
			t.Fatal(err)
		}
		for _, m := range items {
			if m.ConversationID != convB.ID {
				t.Fatalf("B's list contains message of %s", m.ConversationID)
			}
		}
	})

	t.Run("read marker rejects foreign message and counts unread", func(t *testing.T) {
		if err := repo.MarkVisitorRead(ctx, convB.ID, msgA.ID); !errors.Is(err, chat.ErrNotFound) {
			t.Fatalf("foreign message accepted: %v", err)
		}
		if err := repo.MarkVisitorRead(ctx, convB.ID, 9_000_000_000); !errors.Is(err, chat.ErrNotFound) {
			t.Fatalf("nonexistent message accepted: %v", err)
		}

		var mgrID int64
		err := pool.QueryRow(ctx,
			`INSERT INTO chat_messages (conversation_id, author, body) VALUES ($1, 'system', 'answer') RETURNING id`,
			convB.ID).Scan(&mgrID)
		if err != nil {
			t.Fatal(err)
		}

		got, _ := repo.FindByTokenHash(ctx, hashB)
		if got.UnreadForVisitor != 1 {
			t.Fatalf("unread = %d, want 1", got.UnreadForVisitor)
		}
		if err := repo.MarkVisitorRead(ctx, convB.ID, mgrID); err != nil {
			t.Fatal(err)
		}
		got, _ = repo.FindByTokenHash(ctx, hashB)
		if got.UnreadForVisitor != 0 || got.VisitorLastReadID != mgrID {
			t.Fatalf("after read: %+v", got)
		}
	})

	t.Run("database rejects empty and oversized bodies", func(t *testing.T) {
		for _, body := range []string{"   ", strings.Repeat("я", 2001)} {
			_, err := pool.Exec(ctx, `INSERT INTO chat_messages (conversation_id, author, body) VALUES ($1, 'visitor', $2)`, convA.ID, body)
			if err == nil {
				t.Fatalf("body of %d chars accepted", len([]rune(body)))
			}
		}
	})

	t.Run("contact update", func(t *testing.T) {
		if err := repo.UpdateVisitorContact(ctx, convA.ID, "", "+77010000000"); err != nil {
			t.Fatal(err)
		}
		got, _ := repo.FindByTokenHash(ctx, hashA)
		if got.VisitorName != "" || got.VisitorContact != "+77010000000" {
			t.Fatalf("got %+v", got)
		}
	})
}
