package postgres

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/almukha/compnet-backend/internal/domain/chat"
)

func managerReply(staffID, clientID string) chat.Message {
	return chat.Message{Author: chat.AuthorManager, StaffUserID: staffID, ClientMessageID: clientID, Body: "ответ " + clientID[len(clientID)-4:]}
}

func countByClientID(t *testing.T, repo *ChatRepository, convID, clientID string) int {
	t.Helper()
	var n int
	if err := repo.pool.QueryRow(context.Background(),
		`SELECT count(*) FROM chat_messages WHERE conversation_id = $1 AND client_message_id = $2`, convID, clientID).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func statusOf(t *testing.T, repo *ChatRepository, convID string) chat.Status {
	t.Helper()
	c, err := repo.FindByID(context.Background(), convID)
	if err != nil {
		t.Fatal(err)
	}
	return c.Status
}

func TestAddManagerMessage_AtomicWithClose(t *testing.T) {
	pool := testPool(t)
	chatRepo := NewChatRepository(pool)
	staffRepo := NewStaffRepository(pool)
	ctx := context.Background()
	staffUser := newTestStaff(t, staffRepo, fmt.Sprintf("lock-%d@compnet.kz", time.Now().UnixNano()))

	t.Run("send waits for an in-flight close and is then refused", func(t *testing.T) {
		conv, _, _ := newTestConversation(t, chatRepo, "dddddddd-0000-4000-8000-000000000001", "вопрос")

		closeTx, err := pool.Begin(ctx)
		if err != nil {
			t.Fatal(err)
		}
		defer func() { _ = closeTx.Rollback(ctx) }()
		if _, err := closeTx.Exec(ctx, `UPDATE chat_conversations SET status = 'closed' WHERE id = $1`, conv.ID); err != nil {
			t.Fatal(err)
		}

		const clientID = "dddddddd-0000-4000-8000-000000000002"
		done := make(chan error, 1)
		go func() {
			_, _, err := chatRepo.AddManagerMessage(ctx, conv.ID, managerReply(staffUser.ID, clientID))
			done <- err
		}()

		select {
		case err := <-done:
			t.Fatalf("send did not wait for the close lock (err=%v)", err)
		case <-time.After(300 * time.Millisecond):
		}

		if err := closeTx.Commit(ctx); err != nil {
			t.Fatal(err)
		}
		if err := <-done; !errors.Is(err, chat.ErrConversationClosed) {
			t.Fatalf("send after committed close: got %v, want ErrConversationClosed", err)
		}
		if n := countByClientID(t, chatRepo, conv.ID, clientID); n != 0 {
			t.Fatalf("reply stored after close: %d rows", n)
		}
		if s := statusOf(t, chatRepo, conv.ID); s != chat.StatusClosed {
			t.Fatalf("status = %s, want closed", s)
		}
	})

	t.Run("close waits for an in-flight send", func(t *testing.T) {
		conv, _, _ := newTestConversation(t, chatRepo, "dddddddd-0000-4000-8000-000000000003", "вопрос")

		// Hold the same row lock AddManagerMessage takes, as a send in progress.
		sendTx, err := pool.Begin(ctx)
		if err != nil {
			t.Fatal(err)
		}
		defer func() { _ = sendTx.Rollback(ctx) }()
		if _, err := sendTx.Exec(ctx, `SELECT 1 FROM chat_conversations WHERE id = $1 FOR UPDATE`, conv.ID); err != nil {
			t.Fatal(err)
		}

		done := make(chan error, 1)
		go func() { done <- chatRepo.SetStatus(ctx, conv.ID, chat.StatusClosed) }()
		select {
		case err := <-done:
			t.Fatalf("close did not wait for the send lock (err=%v)", err)
		case <-time.After(300 * time.Millisecond):
		}
		_ = sendTx.Commit(ctx)
		if err := <-done; err != nil {
			t.Fatal(err)
		}
	})

	t.Run("concurrent close and send: outcome always consistent", func(t *testing.T) {
		const rounds = 40
		for i := 0; i < rounds; i++ {
			conv, _, _ := newTestConversation(t, chatRepo, fmt.Sprintf("eeeeeeee-0000-4000-8000-%012d", i), "вопрос")
			clientID := fmt.Sprintf("ffffffff-0000-4000-8000-%012d", i)

			var (
				wg      sync.WaitGroup
				sendErr error
				created bool
			)
			start := make(chan struct{})
			wg.Add(2)
			go func() {
				defer wg.Done()
				<-start
				_, created, sendErr = chatRepo.AddManagerMessage(ctx, conv.ID, managerReply(staffUser.ID, clientID))
			}()
			go func() {
				defer wg.Done()
				<-start
				if err := chatRepo.SetStatus(ctx, conv.ID, chat.StatusClosed); err != nil {
					t.Error(err)
				}
			}()
			close(start)
			wg.Wait()

			rows := countByClientID(t, chatRepo, conv.ID, clientID)
			switch {
			case sendErr == nil && created && rows == 1:
				// send committed before the close
			case errors.Is(sendErr, chat.ErrConversationClosed) && rows == 0:
				// close committed before the send
			default:
				t.Fatalf("round %d: inconsistent outcome: err=%v created=%v rows=%d", i, sendErr, created, rows)
			}
			if s := statusOf(t, chatRepo, conv.ID); s != chat.StatusClosed {
				t.Fatalf("round %d: a reply reopened the closed conversation (status=%s)", i, s)
			}
		}
	})

	t.Run("retry of an earlier reply after close: no duplicate", func(t *testing.T) {
		conv, _, _ := newTestConversation(t, chatRepo, "dddddddd-0000-4000-8000-000000000004", "вопрос")
		const clientID = "dddddddd-0000-4000-8000-000000000005"

		first, created, err := chatRepo.AddManagerMessage(ctx, conv.ID, managerReply(staffUser.ID, clientID))
		if err != nil || !created {
			t.Fatalf("first send: created=%v err=%v", created, err)
		}
		if err := chatRepo.SetStatus(ctx, conv.ID, chat.StatusClosed); err != nil {
			t.Fatal(err)
		}
		again, created, err := chatRepo.AddManagerMessage(ctx, conv.ID, managerReply(staffUser.ID, clientID))
		if err != nil || created || again.ID != first.ID {
			t.Fatalf("retry after close: id=%d created=%v err=%v", again.ID, created, err)
		}
		if n := countByClientID(t, chatRepo, conv.ID, clientID); n != 1 {
			t.Fatalf("rows = %d, want 1", n)
		}
		_, _, err = chatRepo.AddManagerMessage(ctx, conv.ID, managerReply(staffUser.ID, "dddddddd-0000-4000-8000-000000000006"))
		if !errors.Is(err, chat.ErrConversationClosed) {
			t.Fatalf("new reply to closed: %v", err)
		}
		if _, _, err := chatRepo.AddManagerMessage(ctx, "11111111-1111-4111-8111-111111111111", managerReply(staffUser.ID, clientID)); !errors.Is(err, chat.ErrNotFound) {
			t.Fatalf("unknown conversation: %v", err)
		}
	})
}
