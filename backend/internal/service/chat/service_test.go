package chat

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/chat"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/security"
)

// fakeRepo is an in-memory Repository with the same ownership and
// idempotency semantics as the PostgreSQL implementation.
type fakeRepo struct {
	convs    map[string]*chat.Conversation // by id
	messages []chat.Message
	nextID   int64
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{convs: map[string]*chat.Conversation{}}
}

func (f *fakeRepo) FindByTokenHash(_ context.Context, hash []byte) (chat.Conversation, error) {
	for _, c := range f.convs {
		if string(c.VisitorTokenHash) == string(hash) {
			out := *c
			for _, m := range f.messages {
				if m.ConversationID != c.ID {
					continue
				}
				out.LastMessageID = m.ID
				if m.Author != chat.AuthorVisitor && m.ID > c.VisitorLastReadID {
					out.UnreadForVisitor++
				}
			}
			return out, nil
		}
	}
	return chat.Conversation{}, chat.ErrNotFound
}

func (f *fakeRepo) Create(_ context.Context, conv chat.Conversation) (chat.Conversation, error) {
	conv.ID = fmt.Sprintf("conv-%d", len(f.convs)+1)
	conv.Status = chat.StatusOpen
	f.convs[conv.ID] = &conv
	return conv, nil
}

func (f *fakeRepo) messagesIn(convID string) int {
	n := 0
	for _, m := range f.messages {
		if m.ConversationID == convID {
			n++
		}
	}
	return n
}

func (f *fakeRepo) AddMessage(_ context.Context, convID string, msg chat.Message) (chat.Message, bool, error) {
	for _, m := range f.messages {
		if m.ConversationID == convID && m.ClientMessageID == msg.ClientMessageID {
			return m, false, nil
		}
	}
	f.nextID++
	msg.ID = f.nextID
	msg.ConversationID = convID
	msg.CreatedAt = time.Now()
	f.messages = append(f.messages, msg)
	return msg, true, nil
}

func (f *fakeRepo) ListMessages(_ context.Context, convID string, after int64, limit int) ([]chat.Message, error) {
	out := []chat.Message{}
	for _, m := range f.messages {
		if m.ConversationID == convID && m.ID > after && len(out) < limit {
			out = append(out, m)
		}
	}
	return out, nil
}

func (f *fakeRepo) MarkVisitorRead(_ context.Context, convID string, id int64) error {
	for _, m := range f.messages {
		if m.ConversationID == convID && m.ID == id {
			c := f.convs[convID]
			if id > c.VisitorLastReadID {
				c.VisitorLastReadID = id
			}
			return nil
		}
	}
	return chat.ErrNotFound
}

func (f *fakeRepo) UpdateVisitorContact(_ context.Context, convID, name, contact string) error {
	c, ok := f.convs[convID]
	if !ok {
		return chat.ErrNotFound
	}
	c.VisitorName, c.VisitorContact = name, contact
	return nil
}

func (f *fakeRepo) addManagerMessage(convID, body string) chat.Message {
	m, _, _ := f.AddMessage(context.Background(), convID, chat.Message{
		Author: chat.AuthorManager, ClientMessageID: fmt.Sprintf("mgr-%d", f.nextID+1), Body: body,
	})
	return m
}

type allowAll struct{}

func (allowAll) Allow(string) (bool, time.Duration) { return true, 0 }

type denyAll struct{}

func (denyAll) Allow(string) (bool, time.Duration) { return false, 30 * time.Second }

const (
	uuidA = "11111111-1111-4111-8111-111111111111"
	uuidB = "22222222-2222-4222-8222-222222222222"
)

func newService() (*Service, *fakeRepo) {
	repo := newFakeRepo()
	return NewService(repo, Limits{NewConversation: allowAll{}, Messages: allowAll{}}), repo
}

func startSession(t *testing.T, s *Service, token string) StartSessionResult {
	t.Helper()
	res, err := s.StartSession(context.Background(), StartSessionInput{
		Token: token, ClientIP: "203.0.113.1", PageURL: "https://compnet.kz/contact",
	})
	if err != nil {
		t.Fatalf("StartSession: %v", err)
	}
	return res
}

func send(t *testing.T, s *Service, token, clientID, body string) SendMessageResult {
	t.Helper()
	res, err := s.SendMessage(context.Background(), SendMessageInput{
		Token:   token,
		Request: dto.SendChatMessageRequest{ClientMessageID: clientID, Body: body},
	})
	if err != nil {
		t.Fatalf("SendMessage: %v", err)
	}
	return res
}

// newVisitor starts a session and sends a first message, returning the token.
func newVisitor(t *testing.T, s *Service, clientID, body string) (string, SendMessageResult) {
	t.Helper()
	token := startSession(t, s, "").NewToken
	return token, send(t, s, token, clientID, body)
}

func wantCode(t *testing.T, err error, code apperr.Code) {
	t.Helper()
	var appErr *apperr.Error
	if !errors.As(err, &appErr) || appErr.Code != code {
		t.Fatalf("want %s error, got %v", code, err)
	}
}

func TestStartSession_CreatesEmptyConversationAndToken(t *testing.T) {
	s, repo := newService()

	res := startSession(t, s, "")
	if !security.ValidTokenFormat(res.NewToken) {
		t.Fatalf("expected a fresh token, got %q", res.NewToken)
	}
	conv := repo.convs[res.Conversation.ID]
	if string(conv.VisitorTokenHash) != string(security.HashToken(res.NewToken)) {
		t.Fatal("stored hash does not match the issued token")
	}
	if conv.PageURL != "https://compnet.kz/contact" || repo.messagesIn(conv.ID) != 0 {
		t.Fatalf("unexpected conversation %+v", conv)
	}

	// Retrying with the cookie returns the same conversation, no new token.
	again := startSession(t, s, res.NewToken)
	if again.NewToken != "" || again.Conversation.ID != res.Conversation.ID || len(repo.convs) != 1 {
		t.Fatalf("retry with cookie: %+v, conversations=%d", again, len(repo.convs))
	}

	// An unknown (forged) token is never adopted.
	forged, _, _ := security.NewToken()
	other := startSession(t, s, forged)
	if other.NewToken == "" || other.NewToken == forged {
		t.Fatal("unknown token must be replaced by a server-issued one")
	}
}

func TestSendMessage_RequiresSession(t *testing.T) {
	s, repo := newService()
	forged, _, _ := security.NewToken()

	for _, token := range []string{"", "garbage", forged} {
		_, err := s.SendMessage(context.Background(), SendMessageInput{
			Token:   token,
			Request: dto.SendChatMessageRequest{ClientMessageID: uuidA, Body: "hi"},
		})
		wantCode(t, err, apperr.CodeNotFound)
	}
	if len(repo.convs) != 0 || len(repo.messages) != 0 {
		t.Fatal("sending without a session must not create anything")
	}
}

// Limitation #4 from stage 1: the response to the first message is lost.
// Because the session (cookie) was established before sending, the retry
// reaches the same conversation and is deduplicated.
func TestLostResponseToFirstMessage_RetryDoesNotDuplicate(t *testing.T) {
	s, repo := newService()

	token := startSession(t, s, "").NewToken
	first := send(t, s, token, uuidA, "Здравствуйте")
	// ...response lost; the widget retries with the same cookie and client id.
	retry := send(t, s, token, uuidA, "Здравствуйте")

	if retry.Created || retry.Message.ID != first.Message.ID {
		t.Fatalf("retry created a new message: %+v", retry)
	}
	if len(repo.convs) != 1 || len(repo.messages) != 1 {
		t.Fatalf("conversations=%d messages=%d, want 1/1", len(repo.convs), len(repo.messages))
	}
}

// The response to POST /session is lost: the widget retries the session
// call, which creates a second, empty conversation. The message is sent only
// once, after a session is confirmed, so it is never duplicated.
func TestLostSessionResponse_LeavesOnlyEmptyConversation(t *testing.T) {
	s, repo := newService()

	lost := startSession(t, s, "") // the browser never receives this cookie
	token := startSession(t, s, "").NewToken
	send(t, s, token, uuidA, "Здравствуйте")

	if repo.messagesIn(lost.Conversation.ID) != 0 || len(repo.messages) != 1 {
		t.Fatalf("messages: lost=%d total=%d", repo.messagesIn(lost.Conversation.ID), len(repo.messages))
	}
}

func TestSendMessage_ClientIDDoesNotGrantAccess(t *testing.T) {
	s, repo := newService()

	_, a := newVisitor(t, s, uuidA, "secret of A")
	tokenB := startSession(t, s, "").NewToken

	// B reuses A's client_message_id: it is stored as B's own new message
	// and A's message is neither returned nor modified.
	res := send(t, s, tokenB, uuidA, "B's text")
	if !res.Created || res.Message.ConversationID == a.Message.ConversationID || res.Message.Body != "B's text" {
		t.Fatalf("client id leaked across conversations: %+v", res)
	}
	if repo.messagesIn(a.Message.ConversationID) != 1 {
		t.Fatal("A's conversation changed")
	}
}

func TestSendMessage_DuplicateClientIDIsIdempotent(t *testing.T) {
	s, repo := newService()
	token, first := newVisitor(t, s, uuidA, "hi")

	again := send(t, s, token, uuidA, "hi")
	if again.Created || again.Message.ID != first.Message.ID {
		t.Fatalf("retry created a new message: %+v", again)
	}
	if len(repo.messages) != 1 {
		t.Fatalf("messages stored = %d, want 1", len(repo.messages))
	}

	_, err := s.SendMessage(context.Background(), SendMessageInput{
		Token:   token,
		Request: dto.SendChatMessageRequest{ClientMessageID: uuidA, Body: "different"},
	})
	wantCode(t, err, apperr.CodeConflict)
}

func TestSendMessage_ValidationAndHoneypot(t *testing.T) {
	s, repo := newService()
	ctx := context.Background()
	token := startSession(t, s, "").NewToken

	_, err := s.SendMessage(ctx, SendMessageInput{Token: token, Request: dto.SendChatMessageRequest{ClientMessageID: uuidA, Body: "   "}})
	wantCode(t, err, apperr.CodeValidation)

	_, err = s.SendMessage(ctx, SendMessageInput{Token: token, Request: dto.SendChatMessageRequest{ClientMessageID: uuidA, Body: "spam", Website: "http://x"}})
	wantCode(t, err, apperr.CodeBadRequest)

	if len(repo.messages) != 0 {
		t.Fatal("invalid requests stored a message")
	}
}

func TestSendMessage_RateLimits(t *testing.T) {
	repo := newFakeRepo()
	s := NewService(repo, Limits{NewConversation: denyAll{}, Messages: allowAll{}})
	_, err := s.StartSession(context.Background(), StartSessionInput{ClientIP: "203.0.113.1"})
	wantCode(t, err, apperr.CodeRateLimit)

	s = NewService(repo, Limits{NewConversation: allowAll{}, Messages: allowAll{}})
	token, _ := newVisitor(t, s, uuidA, "hi")

	// An existing session is returned even when new sessions are limited.
	s = NewService(repo, Limits{NewConversation: denyAll{}, Messages: denyAll{}})
	if _, err := s.StartSession(context.Background(), StartSessionInput{Token: token}); err != nil {
		t.Fatalf("existing session blocked: %v", err)
	}
	_, err = s.SendMessage(context.Background(), SendMessageInput{Token: token, Request: dto.SendChatMessageRequest{ClientMessageID: uuidB, Body: "again"}})
	wantCode(t, err, apperr.CodeRateLimit)
}

func TestVisitorsAreIsolated(t *testing.T) {
	s, _ := newService()
	ctx := context.Background()

	_, a := newVisitor(t, s, uuidA, "secret of A")
	tokenB, _ := newVisitor(t, s, uuidB, "message of B")

	page, err := s.ListMessages(ctx, tokenB, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(page.Messages) != 1 || page.Messages[0].Body != "message of B" {
		t.Fatalf("B sees %+v", page.Messages)
	}

	// B cannot mark A's message as read through their own conversation.
	_, err = s.MarkRead(ctx, tokenB, dto.MarkChatReadRequest{LastMessageID: a.Message.ID})
	wantCode(t, err, apperr.CodeValidation)

	// No token or a forged token sees nothing at all.
	forged, _, _ := security.NewToken()
	for _, token := range []string{"", "garbage", forged} {
		page, err := s.ListMessages(ctx, token, 0)
		if err != nil || len(page.Messages) != 0 || page.Exists {
			t.Fatalf("token %q: %+v, %v", token, page, err)
		}
		_, exists, err := s.GetConversation(ctx, token)
		if err != nil || exists {
			t.Fatalf("token %q: conversation exists=%v err=%v", token, exists, err)
		}
		_, err = s.MarkRead(ctx, token, dto.MarkChatReadRequest{LastMessageID: a.Message.ID})
		wantCode(t, err, apperr.CodeNotFound)
	}
}

func TestUnreadCount(t *testing.T) {
	s, repo := newService()
	ctx := context.Background()

	token, v := newVisitor(t, s, uuidA, "hi")
	convID := v.Message.ConversationID

	conv, _, _ := s.GetConversation(ctx, token)
	if conv.UnreadForVisitor != 0 {
		t.Fatalf("own message counted as unread: %d", conv.UnreadForVisitor)
	}

	m1 := repo.addManagerMessage(convID, "Здравствуйте!")
	m2 := repo.addManagerMessage(convID, "Чем помочь?")

	conv, _, _ = s.GetConversation(ctx, token)
	if conv.UnreadForVisitor != 2 || conv.LastMessageID != m2.ID {
		t.Fatalf("unread=%d last=%d", conv.UnreadForVisitor, conv.LastMessageID)
	}

	conv, err := s.MarkRead(ctx, token, dto.MarkChatReadRequest{LastMessageID: m1.ID})
	if err != nil || conv.UnreadForVisitor != 1 {
		t.Fatalf("after reading m1: unread=%d err=%v", conv.UnreadForVisitor, err)
	}

	conv, _ = s.MarkRead(ctx, token, dto.MarkChatReadRequest{LastMessageID: m2.ID})
	if conv.UnreadForVisitor != 0 {
		t.Fatalf("after reading m2: unread=%d", conv.UnreadForVisitor)
	}

	// Marker never moves backwards.
	conv, _ = s.MarkRead(ctx, token, dto.MarkChatReadRequest{LastMessageID: m1.ID})
	if conv.VisitorLastReadID != m2.ID || conv.UnreadForVisitor != 0 {
		t.Fatalf("marker moved back: last_read=%d unread=%d", conv.VisitorLastReadID, conv.UnreadForVisitor)
	}
}

func TestListMessages_AfterAndPaging(t *testing.T) {
	s, repo := newService()
	ctx := context.Background()

	token, v := newVisitor(t, s, uuidA, "first")
	for i := 0; i < PageSize+5; i++ {
		repo.addManagerMessage(v.Message.ConversationID, "m")
	}

	page, err := s.ListMessages(ctx, token, 0)
	if err != nil || len(page.Messages) != PageSize || !page.HasMore {
		t.Fatalf("first page: len=%d hasMore=%v err=%v", len(page.Messages), page.HasMore, err)
	}

	last := page.Messages[len(page.Messages)-1].ID
	page, _ = s.ListMessages(ctx, token, last)
	if len(page.Messages) != 6 || page.HasMore {
		t.Fatalf("second page: len=%d hasMore=%v", len(page.Messages), page.HasMore)
	}

	_, err = s.ListMessages(ctx, token, -1)
	wantCode(t, err, apperr.CodeValidation)
}

func TestUpdateContact(t *testing.T) {
	s, _ := newService()
	ctx := context.Background()

	_, err := s.UpdateContact(ctx, "", dto.UpdateChatContactRequest{Contact: "+77010000000"})
	wantCode(t, err, apperr.CodeNotFound)

	token := startSession(t, s, "").NewToken
	conv, err := s.UpdateContact(ctx, token, dto.UpdateChatContactRequest{Name: " Айдана ", Contact: " +77010000000 "})
	if err != nil || conv.VisitorName != "Айдана" || conv.VisitorContact != "+77010000000" {
		t.Fatalf("conv=%+v err=%v", conv, err)
	}
}

func TestSanitizePageURL(t *testing.T) {
	tests := map[string]string{
		"https://compnet.kz/": "https://compnet.kz/",
		"javascript:alert(1)": "",
		"ftp://x":             "",
		"":                    "",
	}
	for in, want := range tests {
		if got := sanitizePageURL(in); got != want {
			t.Errorf("sanitizePageURL(%q) = %q, want %q", in, got, want)
		}
	}
}
