package postgres

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/almukha/compnet-backend/internal/domain/chat"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/security"
)

func newTestStaff(t *testing.T, repo *StaffRepository, email string) staff.User {
	t.Helper()
	u, err := repo.Create(context.Background(), staff.User{
		Email: email, PasswordHash: "$2a$04$" + fmt.Sprintf("%053d", 0), DisplayName: "Тест", Role: staff.RoleManager, IsActive: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		ctx := context.Background()
		_, _ = repo.pool.Exec(ctx, `DELETE FROM chat_messages WHERE staff_user_id = $1`, u.ID)
		_, _ = repo.pool.Exec(ctx, `DELETE FROM staff_users WHERE id = $1`, u.ID)
	})
	return u
}

func TestStaffRepository_Integration(t *testing.T) {
	pool := testPool(t)
	repo := NewStaffRepository(pool)
	ctx := context.Background()
	email := fmt.Sprintf("it-%d@compnet.kz", time.Now().UnixNano())
	u := newTestStaff(t, repo, email)

	t.Run("email unique", func(t *testing.T) {
		_, err := repo.Create(ctx, staff.User{Email: email, PasswordHash: u.PasswordHash, DisplayName: "X", Role: staff.RoleManager, IsActive: true})
		if !errors.Is(err, staff.ErrEmailTaken) {
			t.Fatalf("got %v", err)
		}
		got, err := repo.FindByEmail(ctx, email)
		if err != nil || got.ID != u.ID {
			t.Fatalf("find: %+v %v", got, err)
		}
	})

	t.Run("session valid, expired, revoked", func(t *testing.T) {
		_, hash, _ := security.NewToken()
		if _, err := repo.CreateSession(ctx, u.ID, hash, time.Now().Add(time.Hour)); err != nil {
			t.Fatal(err)
		}
		if got, _, err := repo.FindSession(ctx, hash); err != nil || got.ID != u.ID {
			t.Fatalf("valid: %v", err)
		}

		_, _ = pool.Exec(ctx, `UPDATE staff_sessions SET created_at = now() - interval '2 hours', expires_at = now() - interval '1 second' WHERE token_hash = $1`, hash)
		if _, _, err := repo.FindSession(ctx, hash); !errors.Is(err, staff.ErrNotFound) {
			t.Fatalf("expired session accepted: %v", err)
		}

		_, hash2, _ := security.NewToken()
		_, _ = repo.CreateSession(ctx, u.ID, hash2, time.Now().Add(time.Hour))
		if err := repo.RevokeSession(ctx, hash2); err != nil {
			t.Fatal(err)
		}
		if _, _, err := repo.FindSession(ctx, hash2); !errors.Is(err, staff.ErrNotFound) {
			t.Fatalf("revoked session accepted: %v", err)
		}
	})

	chatRepo := NewChatRepository(pool)
	conv, _, _ := newTestConversation(t, chatRepo, "cccccccc-0000-4000-8000-000000000001", "вопрос посетителя")

	t.Run("manager message references staff; FK and author check enforced", func(t *testing.T) {
		msg, created, err := chatRepo.AddMessage(ctx, conv.ID, chat.Message{
			Author: chat.AuthorManager, StaffUserID: u.ID, ClientMessageID: "cccccccc-0000-4000-8000-000000000002", Body: "ответ",
		})
		if err != nil || !created || msg.StaffUserID != "" && msg.StaffUserID != u.ID {
			t.Fatalf("add: %+v %v", msg, err)
		}
		_, _, err = chatRepo.AddMessage(ctx, conv.ID, chat.Message{
			Author: chat.AuthorManager, StaffUserID: "11111111-1111-4111-8111-111111111111", ClientMessageID: "cccccccc-0000-4000-8000-000000000003", Body: "x",
		})
		if err == nil {
			t.Fatal("unknown staff_user_id accepted (FK missing)")
		}
		_, _, err = chatRepo.AddMessage(ctx, conv.ID, chat.Message{
			Author: chat.AuthorManager, ClientMessageID: "cccccccc-0000-4000-8000-000000000004", Body: "x",
		})
		if err == nil {
			t.Fatal("manager message without staff_user_id accepted")
		}
		if _, err := pool.Exec(ctx, `DELETE FROM staff_users WHERE id = $1`, u.ID); err == nil {
			t.Fatal("deleting a staff user with messages must be restricted")
		}
	})

	t.Run("history page joins author name; read markers independent", func(t *testing.T) {
		items, err := chatRepo.ListMessagePage(ctx, conv.ID, chat.MessagePage{Limit: 10})
		if err != nil || len(items) != 2 || items[1].StaffDisplayName != "Тест" || items[0].Author != chat.AuthorVisitor {
			t.Fatalf("page: %+v %v", items, err)
		}
		c, _ := chatRepo.FindByID(ctx, conv.ID)
		if c.UnreadForManager != 1 || c.UnreadForVisitor != 1 {
			t.Fatalf("before: manager=%d visitor=%d", c.UnreadForManager, c.UnreadForVisitor)
		}
		if err := chatRepo.MarkManagerRead(ctx, conv.ID, items[0].ID); err != nil {
			t.Fatal(err)
		}
		c, _ = chatRepo.FindByID(ctx, conv.ID)
		if c.UnreadForManager != 0 || c.UnreadForVisitor != 1 || c.VisitorLastReadID != 0 {
			t.Fatalf("after manager read: %+v", c)
		}
		if err := chatRepo.MarkManagerRead(ctx, conv.ID, 9_000_000_000); !errors.Is(err, chat.ErrNotFound) {
			t.Fatalf("foreign id accepted: %v", err)
		}
	})

	t.Run("inbox lists only conversations with messages, cursor pages", func(t *testing.T) {
		_, hash, _ := security.NewToken()
		empty, _ := chatRepo.Create(ctx, chat.Conversation{VisitorTokenHash: hash})
		t.Cleanup(func() { _, _ = pool.Exec(ctx, `DELETE FROM chat_conversations WHERE id = $1`, empty.ID) })

		first, err := chatRepo.ListInbox(ctx, chat.InboxFilter{Limit: 1000})
		if err != nil {
			t.Fatal(err)
		}
		found := false
		for _, item := range first {
			if item.ID == empty.ID {
				t.Fatal("empty conversation listed")
			}
			if item.ID == conv.ID {
				found = true
				if item.LastMessage == nil || item.LastMessage.Body != "ответ" {
					t.Fatalf("last message: %+v", item.LastMessage)
				}
			}
		}
		if !found {
			t.Fatal("conversation missing from inbox")
		}
		if len(first) >= 2 {
			cursor := chat.ConversationCursor{LastMessageAt: *first[0].LastMessageAt, ID: first[0].ID}
			rest, _ := chatRepo.ListInbox(ctx, chat.InboxFilter{After: &cursor, Limit: 1000})
			if len(rest) != len(first)-1 || rest[0].ID != first[1].ID {
				t.Fatalf("cursor page: got %d rows", len(rest))
			}
		}
		if err := chatRepo.SetStatus(ctx, conv.ID, chat.StatusClosed); err != nil {
			t.Fatal(err)
		}
		open, _ := chatRepo.ListInbox(ctx, chat.InboxFilter{Status: chat.StatusOpen, Limit: 1000})
		for _, item := range open {
			if item.ID == conv.ID {
				t.Fatal("closed conversation in open filter")
			}
		}
	})
}
