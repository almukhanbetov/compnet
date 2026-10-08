package dto

import (
	"strings"
	"testing"
)

const testUUID = "6f1c2a7e-3b4d-4e5f-8a9b-0c1d2e3f4a5b"

func TestSendChatMessageRequest_Validate(t *testing.T) {
	tests := []struct {
		name      string
		req       SendChatMessageRequest
		wantField string
	}{
		{"valid", SendChatMessageRequest{ClientMessageID: testUUID, Body: "Здравствуйте"}, ""},
		{"exactly 2000 chars", SendChatMessageRequest{ClientMessageID: testUUID, Body: strings.Repeat("я", 2000)}, ""},
		{"empty body", SendChatMessageRequest{ClientMessageID: testUUID, Body: ""}, "body"},
		{"whitespace body", SendChatMessageRequest{ClientMessageID: testUUID, Body: " \n\t "}, "body"},
		{"too long", SendChatMessageRequest{ClientMessageID: testUUID, Body: strings.Repeat("я", 2001)}, "body"},
		{"nul byte", SendChatMessageRequest{ClientMessageID: testUUID, Body: "a\x00b"}, "body"},
		{"invalid utf8", SendChatMessageRequest{ClientMessageID: testUUID, Body: "\xff\xfe"}, "body"},
		{"missing client id", SendChatMessageRequest{Body: "hi"}, "client_message_id"},
		{"bad client id", SendChatMessageRequest{ClientMessageID: "123", Body: "hi"}, "client_message_id"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fields := tt.req.Validate()
			if tt.wantField == "" {
				if len(fields) != 0 {
					t.Fatalf("unexpected errors: %v", fields)
				}
				return
			}
			if _, ok := fields[tt.wantField]; !ok {
				t.Fatalf("want error on %q, got %v", tt.wantField, fields)
			}
		})
	}
}

func TestNormalizedChatBody(t *testing.T) {
	if got := NormalizedChatBody("  a\r\nb  "); got != "a\nb" {
		t.Fatalf("got %q", got)
	}
}

func TestMarkChatReadRequest_Validate(t *testing.T) {
	if len((MarkChatReadRequest{LastMessageID: 1}).Validate()) != 0 {
		t.Fatal("valid id rejected")
	}
	for _, id := range []int64{0, -5} {
		if _, ok := (MarkChatReadRequest{LastMessageID: id}).Validate()["last_message_id"]; !ok {
			t.Fatalf("id %d accepted", id)
		}
	}
}

func TestUpdateChatContactRequest_Validate(t *testing.T) {
	tests := []struct {
		name      string
		req       UpdateChatContactRequest
		wantField string
	}{
		{"valid", UpdateChatContactRequest{Name: "Айдана", Contact: "+7 701 000 00 00"}, ""},
		{"contact only", UpdateChatContactRequest{Contact: "@aidana"}, ""},
		{"no contact", UpdateChatContactRequest{Name: "Айдана"}, "contact"},
		{"long name", UpdateChatContactRequest{Name: strings.Repeat("a", 101), Contact: "x"}, "name"},
		{"long contact", UpdateChatContactRequest{Contact: strings.Repeat("a", 201)}, "contact"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fields := tt.req.Validate()
			if tt.wantField == "" {
				if len(fields) != 0 {
					t.Fatalf("unexpected errors: %v", fields)
				}
				return
			}
			if _, ok := fields[tt.wantField]; !ok {
				t.Fatalf("want error on %q, got %v", tt.wantField, fields)
			}
		})
	}
}
