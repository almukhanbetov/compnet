// Package requestevents tells connected managers that a project request was
// saved or changed. Events carry the request id and the "new" counter only —
// no names, contacts or descriptions travel over the socket; the manager
// page re-reads the list and the open request from the HTTP API, which
// checks the staff member's rights on every call.
//
// Publishing is best effort, after the commit. A lost event costs a delay:
// clients re-read the API after every reconnect and poll while offline.
package requestevents

import (
	"context"
	"log"
	"time"

	"github.com/almukha/compnet-backend/internal/realtime"
)

// Counter reads the managers' "new requests" badge.
type Counter interface {
	CountNew(ctx context.Context) (int, error)
}

// Hub delivers events (implemented by *realtime.Hub).
type Hub interface {
	ToManagers(ev realtime.Event)
}

// Publisher implements projectrequest.Notifier and managerrequests.Publisher.
type Publisher struct {
	repo Counter
	hub  Hub
}

// New builds a Publisher.
func New(repo Counter, hub Hub) *Publisher {
	return &Publisher{repo: repo, hub: hub}
}

const publishTimeout = 3 * time.Second

// Data is the payload of project_request_created / project_request_updated.
type Data struct {
	RequestID string `json:"request_id"`
	NewCount  int    `json:"new_count"`
}

// RequestCreated announces a newly saved request.
func (p *Publisher) RequestCreated(ctx context.Context, requestID string) {
	p.publish(ctx, realtime.EventProjectRequestCreated, requestID)
}

// RequestChanged announces a status or note change.
func (p *Publisher) RequestChanged(ctx context.Context, requestID string) {
	p.publish(ctx, realtime.EventProjectRequestUpdated, requestID)
}

func (p *Publisher) publish(ctx context.Context, typ realtime.EventType, requestID string) {
	// Detached: the client that caused the change may already be gone.
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), publishTimeout)
	defer cancel()
	n, err := p.repo.CountNew(ctx)
	if err != nil {
		log.Printf("requestevents: count new requests: %v", err) // no ids or content in logs
		return
	}
	p.hub.ToManagers(realtime.NewEvent(typ, "", Data{RequestID: requestID, NewCount: n}))
}
