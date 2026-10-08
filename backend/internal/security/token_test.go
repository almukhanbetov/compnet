package security

import (
	"bytes"
	"testing"
)

func TestNewToken(t *testing.T) {
	token, hash, err := NewToken()
	if err != nil {
		t.Fatal(err)
	}
	if !ValidTokenFormat(token) {
		t.Fatalf("generated token %q has invalid format", token)
	}
	if len(hash) != 32 {
		t.Fatalf("hash length = %d, want 32", len(hash))
	}
	if !bytes.Equal(hash, HashToken(token)) {
		t.Fatal("returned hash differs from HashToken(token)")
	}

	other, _, _ := NewToken()
	if other == token {
		t.Fatal("two tokens are equal")
	}
}

func TestValidTokenFormat(t *testing.T) {
	valid, _, _ := NewToken()
	tests := map[string]bool{
		valid:                      true,
		"":                         false,
		"short":                    false,
		valid[:len(valid)-1] + "!": false, // right length, invalid alphabet
		valid + "A":                false,
	}
	for input, want := range tests {
		if got := ValidTokenFormat(input); got != want {
			t.Errorf("ValidTokenFormat(%q) = %v, want %v", input, got, want)
		}
	}
}
