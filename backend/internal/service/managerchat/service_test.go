package managerchat

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"testing"
	"time"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/chat"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/http/dto"
)

type fakeRepo struct {
	convs    map[string]*chat.Conversation
	messages []chat.Message
	nextID   int64
	clock    time.Time
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{convs: map[string]*chat.Conversation{}, clock: time.Date(2026, 10, 9, 9, 0, 0, 0, time.UTC)}
}

func (f *fakeRepo) newConversation() string {
	id := fmt.Sprintf("00000000-0000-4000-8000-%012d", len(f.convs)+1)
	f.convs[id] = &chat.Conversation{ID: id, Status: chat.StatusOpen}
	return id
}

func (f *fakeRepo) withDerived(c chat.Conversation) chat.Conversation {
	for _, m := range f.messages {
		if m.ConversationID != c.ID {
			continue
		}
		c.LastMessageID = m.ID
		if m.Author == chat.AuthorVisitor && m.ID > c.ManagerLastReadID {
			c.UnreadForManager++
		}
		if m.Author != chat.AuthorVisitor && m.ID > c.VisitorLastReadID {
			c.UnreadForVisitor++
		}
	}
	return c
}

func (f *fakeRepo) FindByID(_ context.Context, id string) (chat.Conversation, error) {
	c, ok := f.convs[id]
	if !ok {
		return chat.Conversation{}, chat.ErrNotFound
	}
	return f.withDerived(*c), nil
}

func (f *fakeRepo) ListInbox(_ context.Context, filter chat.InboxFilter) ([]chat.ConversationSummary, error) {
	var all []chat.ConversationSummary
	for _, c := range f.convs {
		if c.LastMessageAt == nil || (filter.Status != "" && c.Status != filter.Status) {
			continue
		}
		all = append(all, chat.ConversationSummary{Conversation: f.withDerived(*c)})
	}
	sort.Slice(all, func(i, j int) bool {
		if !all[i].LastMessageAt.Equal(*all[j].LastMessageAt) {
			return all[i].LastMessageAt.After(*all[j].LastMessageAt)
		}
		return all[i].ID > all[j].ID
	})
	var out []chat.ConversationSummary
	for _, s := range all {
		if a := filter.After; a != nil {
			if s.LastMessageAt.After(a.LastMessageAt) || (s.LastMessageAt.Equal(a.LastMessageAt) && s.ID >= a.ID) {
				continue
			}
		}
		if len(out) < filter.Limit {
			out = append(out, s)
		}
	}
	return out, nil
}

func (f *fakeRepo) ListMessagePage(_ context.Context, convID string, p chat.MessagePage) ([]chat.Message, error) {
	var in []chat.Message
	for _, m := range f.messages {
		if m.ConversationID == convID && (p.AfterID == 0 || m.ID > p.AfterID) && (p.BeforeID == 0 || m.ID < p.BeforeID) {
			in = append(in, m)
		}
	}
	if p.AfterID > 0 {
		if len(in) > p.Limit {
			in = in[:p.Limit]
		}
		return in, nil
	}
	if len(in) > p.Limit {
		in = in[len(in)-p.Limit:]
	}
	return in, nil
}

func (f *fakeRepo) AddMessage(_ context.Context, convID string, msg chat.Message) (chat.Message, bool, error) {
	for _, m := range f.messages {
		if m.ConversationID == convID && m.ClientMessageID == msg.ClientMessageID {
			return m, false, nil
		}
	}
	f.nextID++
	f.clock = f.clock.Add(time.Minute)
	msg.ID, msg.ConversationID, msg.CreatedAt = f.nextID, convID, f.clock
	f.messages = append(f.messages, msg)
	c := f.convs[convID]
	at := f.clock
	c.LastMessageAt, c.Status = &at, chat.StatusOpen
	return msg, true, nil
}

func (f *fakeRepo) AddManagerMessage(ctx context.Context, convID string, msg chat.Message) (chat.Message, bool, error) {
	c, ok := f.convs[convID]
	if !ok {
		return chat.Message{}, false, chat.ErrNotFound
	}
	for _, m := range f.messages {
		if m.ConversationID == convID && m.ClientMessageID == msg.ClientMessageID {
			return m, false, nil
		}
	}
	if c.Status == chat.StatusClosed {
		return chat.Message{}, false, chat.ErrConversationClosed
	}
	status := c.Status
	saved, created, err := f.AddMessage(ctx, convID, msg)
	c.Status = status // manager replies never change the status
	return saved, created, err
}

func (f *fakeRepo) MarkManagerRead(_ context.Context, convID string, id int64) error {
	for _, m := range f.messages {
		if m.ConversationID == convID && m.ID == id {
			if c := f.convs[convID]; id > c.ManagerLastReadID {
				c.ManagerLastReadID = id
			}
			return nil
		}
	}
	return chat.ErrNotFound
}

func (f *fakeRepo) SetStatus(_ context.Context, convID string, s chat.Status) error {
	f.convs[convID].Status = s
	return nil
}

func (f *fakeRepo) ManagerUnread(context.Context) (int, int, error) {
	convs, msgs := 0, 0
	for _, c := range f.convs {
		if n := f.withDerived(*c).UnreadForManager; n > 0 {
			convs++
			msgs += n
		}
	}
	return convs, msgs, nil
}

func (f *fakeRepo) visitorWrites(convID, body string) chat.Message {
	m, _, _ := f.AddMessage(context.Background(), convID, chat.Message{
		Author: chat.AuthorVisitor, ClientMessageID: fmt.Sprintf("v-%d", f.nextID+1), Body: body,
	})
	return m
}

var anna = staff.User{ID: "staff-anna", DisplayName: "Анна", Role: staff.RoleManager, IsActive: true}
var boris = staff.User{ID: "staff-boris", DisplayName: "Борис", Role: staff.RoleAdmin, IsActive: true}

const clientA = "aaaaaaaa-0000-4000-8000-000000000001"

func wantCode(t *testing.T, err error, code apperr.Code) {
	t.Helper()
	var appErr *apperr.Error
	if !errors.As(err, &appErr) || appErr.Code != code {
		t.Fatalf("want %s, got %v", code, err)
	}
}

func reply(s *Service, author staff.User, convID, clientID, body string) (SendMessageResult, error) {
	return s.SendMessage(context.Background(), author, convID, dto.ManagerSendMessageRequest{ClientMessageID: clientID, Body: body})
}

func TestSendMessage_AuthorFromSessionAndIdempotent(t *testing.T) {
	repo := newFakeRepo()
	s := NewService(repo)
	conv := repo.newConversation()
	repo.visitorWrites(conv, "Здравствуйте")

	first, err := reply(s, anna, conv, clientA, "Добрый день!")
	if err != nil || !first.Created {
		t.Fatalf("reply: %+v %v", first, err)
	}
	if first.Message.Author != chat.AuthorManager || first.Message.StaffUserID != anna.ID || first.Message.StaffDisplayName != "Анна" {
		t.Fatalf("author not taken from session: %+v", first.Message)
	}

	again, err := reply(s, anna, conv, clientA, "Добрый день!")
	if err != nil || again.Created || again.Message.ID != first.Message.ID || len(repo.messages) != 2 {
		t.Fatalf("retry duplicated: %+v %v (messages=%d)", again, err, len(repo.messages))
	}

	_, err = reply(s, anna, conv, clientA, "Другой текст")
	wantCode(t, err, apperr.CodeConflict)
	_, err = reply(s, boris, conv, clientA, "Добрый день!")
	wantCode(t, err, apperr.CodeConflict)
}

func TestClosedConversation(t *testing.T) {
	repo := newFakeRepo()
	s := NewService(repo)
	ctx := context.Background()
	conv := repo.newConversation()
	repo.visitorWrites(conv, "Вопрос")
	sent, _ := reply(s, anna, conv, clientA, "Ответ")

	closed, err := s.UpdateConversation(ctx, conv, dto.UpdateConversationRequest{Status: "closed"})
	if err != nil || closed.Status != chat.StatusClosed {
		t.Fatalf("close: %+v %v", closed, err)
	}

	// A new manager reply is refused and nothing is stored.
	before := len(repo.messages)
	_, err = reply(s, anna, conv, "bbbbbbbb-0000-4000-8000-000000000001", "Ещё ответ")
	wantCode(t, err, apperr.CodeConflict)
	if len(repo.messages) != before {
		t.Fatal("a reply to a closed conversation was stored")
	}

	// A retry of a reply sent before closing still succeeds (idempotent).
	retry, err := reply(s, anna, conv, clientA, "Ответ")
	if err != nil || retry.Created || retry.Message.ID != sent.Message.ID {
		t.Fatalf("retry after close: %+v %v", retry, err)
	}

	// A visitor message reopens it.
	repo.visitorWrites(conv, "Я снова здесь")
	got, _ := repo.FindByID(ctx, conv)
	if got.Status != chat.StatusOpen {
		t.Fatalf("visitor message must reopen, status=%s", got.Status)
	}
	if _, err := reply(s, anna, conv, "cccccccc-0000-4000-8000-000000000001", "Отвечаю"); err != nil {
		t.Fatalf("reply after reopen: %v", err)
	}
}

func TestReadMarkersAreIndependent(t *testing.T) {
	repo := newFakeRepo()
	s := NewService(repo)
	ctx := context.Background()
	conv := repo.newConversation()
	v1 := repo.visitorWrites(conv, "Раз")
	v2 := repo.visitorWrites(conv, "Два")

	c, _ := repo.FindByID(ctx, conv)
	if c.UnreadForManager != 2 || c.UnreadForVisitor != 0 {
		t.Fatalf("start: manager=%d visitor=%d", c.UnreadForManager, c.UnreadForVisitor)
	}

	reply(s, anna, conv, clientA, "Ответ")
	c, _ = repo.FindByID(ctx, conv)
	if c.UnreadForManager != 2 || c.UnreadForVisitor != 1 {
		t.Fatalf("a reply must not mark anything read: manager=%d visitor=%d", c.UnreadForManager, c.UnreadForVisitor)
	}

	c, err := s.MarkRead(ctx, conv, dto.MarkChatReadRequest{LastMessageID: v1.ID})
	if err != nil || c.UnreadForManager != 1 || c.UnreadForVisitor != 1 || c.VisitorLastReadID != 0 {
		t.Fatalf("after manager read: %+v %v", c, err)
	}
	c, _ = s.MarkRead(ctx, conv, dto.MarkChatReadRequest{LastMessageID: v2.ID})
	if c.UnreadForManager != 0 || c.UnreadForVisitor != 1 {
		t.Fatalf("manager reading must not touch the visitor's counter: %+v", c)
	}

	other := repo.newConversation()
	foreign := repo.visitorWrites(other, "Чужое")
	_, err = s.MarkRead(ctx, conv, dto.MarkChatReadRequest{LastMessageID: foreign.ID})
	wantCode(t, err, apperr.CodeValidation)

	convs, msgs, _ := s.UnreadCount(ctx)
	if convs != 1 || msgs != 1 {
		t.Fatalf("unread-count = %d/%d, want 1/1", convs, msgs)
	}
}

func TestListConversations_PaginationAndFilter(t *testing.T) {
	repo := newFakeRepo()
	s := NewService(repo)
	ctx := context.Background()
	for i := 0; i < 5; i++ {
		repo.visitorWrites(repo.newConversation(), fmt.Sprintf("msg %d", i))
	}
	repo.newConversation() // empty: never listed

	seen := map[string]bool{}
	cursor := ""
	pages := 0
	for {
		page, err := s.ListConversations(ctx, InboxQuery{Status: "all", Cursor: cursor, Limit: "2"})
		if err != nil {
			t.Fatal(err)
		}
		pages++
		for _, item := range page.Items {
			if seen[item.ID] {
				t.Fatalf("duplicate across pages: %s", item.ID)
			}
			seen[item.ID] = true
		}
		if page.NextCursor == "" {
			break
		}
		cursor = page.NextCursor
	}
	if len(seen) != 5 || pages != 3 {
		t.Fatalf("saw %d conversations in %d pages, want 5 in 3", len(seen), pages)
	}

	for _, q := range []InboxQuery{{Status: "deleted"}, {Limit: "0"}, {Limit: "101"}, {Cursor: "%%%"}} {
		_, err := s.ListConversations(ctx, q)
		wantCode(t, err, apperr.CodeValidation)
	}
}

func TestListMessages_Paging(t *testing.T) {
	repo := newFakeRepo()
	s := NewService(repo)
	ctx := context.Background()
	conv := repo.newConversation()
	for i := 0; i < 7; i++ {
		repo.visitorWrites(conv, fmt.Sprintf("m%d", i+1))
	}

	latest, err := s.ListMessages(ctx, conv, MessagesQuery{Limit: "3"})
	if err != nil || len(latest.Messages) != 3 || !latest.HasMore || latest.Messages[0].Body != "m5" || latest.Messages[2].Body != "m7" {
		t.Fatalf("latest page: %+v %v", latest.Messages, err)
	}
	older, _ := s.ListMessages(ctx, conv, MessagesQuery{Before: latest.Messages[0].ID, Limit: "3"})
	if len(older.Messages) != 3 || older.Messages[0].Body != "m2" || !older.HasMore {
		t.Fatalf("older page: %+v", older.Messages)
	}
	oldest, _ := s.ListMessages(ctx, conv, MessagesQuery{Before: older.Messages[0].ID, Limit: "3"})
	if len(oldest.Messages) != 1 || oldest.HasMore {
		t.Fatalf("oldest page: %+v hasMore=%v", oldest.Messages, oldest.HasMore)
	}
	newer, _ := s.ListMessages(ctx, conv, MessagesQuery{After: oldest.Messages[0].ID, Limit: "2"})
	if len(newer.Messages) != 2 || newer.Messages[0].Body != "m2" || !newer.HasMore {
		t.Fatalf("newer page: %+v", newer.Messages)
	}

	_, err = s.ListMessages(ctx, conv, MessagesQuery{After: 1, Before: 5})
	wantCode(t, err, apperr.CodeValidation)
	_, err = s.ListMessages(ctx, "not-a-uuid", MessagesQuery{})
	wantCode(t, err, apperr.CodeNotFound)
	_, err = s.ListMessages(ctx, "11111111-1111-4111-8111-111111111111", MessagesQuery{})
	wantCode(t, err, apperr.CodeNotFound)
}

func TestCursorRoundTrip(t *testing.T) {
	c := chat.ConversationCursor{LastMessageAt: time.Date(2026, 10, 9, 9, 1, 2, 345678000, time.UTC), ID: "00000000-0000-4000-8000-000000000001"}
	got, err := decodeCursor(encodeCursor(c))
	if err != nil || !got.LastMessageAt.Equal(c.LastMessageAt) || got.ID != c.ID {
		t.Fatalf("round trip: %+v %v", got, err)
	}
}
