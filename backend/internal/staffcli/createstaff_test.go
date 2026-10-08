package staffcli

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/service/staffauth"
)

type fakeCreator struct {
	got   staffauth.CreateStaffInput
	calls int
}

func (f *fakeCreator) CreateStaff(_ context.Context, in staffauth.CreateStaffInput) (staff.User, error) {
	f.calls++
	f.got = in
	return staff.User{ID: "id-1", Email: in.Email, DisplayName: in.DisplayName, Role: in.Role}, nil
}

func answers(values ...string) PasswordReader {
	return func(string) (string, error) {
		v := values[0]
		values = values[1:]
		return v, nil
	}
}

func TestRun(t *testing.T) {
	const pw = "a very long secret"
	creator := &fakeCreator{}
	var out bytes.Buffer

	args, err := ParseArgs([]string{"-email", "anna@compnet.kz", "-name", "Анна"})
	if err != nil {
		t.Fatal(err)
	}
	err = Run(context.Background(), args, creator, answers(pw, pw), &out)
	if err != nil {
		t.Fatal(err)
	}
	if creator.got.Password != pw || creator.got.Role != staff.RoleManager {
		t.Fatalf("got %+v", creator.got)
	}
	if strings.Contains(out.String(), pw) {
		t.Fatal("password must never be printed")
	}

	failures := map[string]struct {
		args []string
		read PasswordReader
	}{
		"mismatch":       {[]string{"-email", "a@b.kz", "-name", "A"}, answers(pw, pw+"x")},
		"weak":           {[]string{"-email", "a@b.kz", "-name", "A"}, answers("short", "short")},
		"no email":       {[]string{"-name", "A"}, answers(pw, pw)},
		"password flag":  {[]string{"-email", "a@b.kz", "-name", "A", "-password", pw}, answers(pw, pw)},
		"extra argument": {[]string{"-email", "a@b.kz", "-name", "A", pw}, answers(pw, pw)},
	}
	for name, tc := range failures {
		t.Run(name, func(t *testing.T) {
			c := &fakeCreator{}
			args, err := ParseArgs(tc.args)
			if err == nil {
				err = Run(context.Background(), args, c, tc.read, &bytes.Buffer{})
			}
			if err == nil || c.calls != 0 {
				t.Fatalf("err=%v calls=%d", err, c.calls)
			}
			if strings.Contains(err.Error(), pw) {
				t.Fatal("error leaks the password")
			}
		})
	}
}
