// Package staffcli implements `api create-staff`, the only way to create
// staff accounts (there is no public registration). The password is read
// interactively from the terminal with echo turned off; it is never taken
// from arguments or environment variables and never logged.
package staffcli

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/service/staffauth"
)

// Creator creates staff accounts (see staffauth.Service.CreateStaff).
type Creator interface {
	CreateStaff(ctx context.Context, in staffauth.CreateStaffInput) (staff.User, error)
}

// PasswordReader reads one line from the terminal without echoing it.
type PasswordReader func(prompt string) (string, error)

// Usage is printed on argument errors.
const Usage = `usage: api create-staff -email EMAIL -name "DISPLAY NAME" [-role manager|admin]

Creates a staff account for the manager section. The password is asked
interactively (twice, not shown). Run it in an interactive terminal, e.g.:
  docker exec -it compnet-backend ./api create-staff -email anna@compnet.kz -name "Анна"`

// Args are the parsed command-line arguments. There is deliberately no
// password flag.
type Args struct {
	Email string
	Name  string
	Role  staff.Role
}

// ParseArgs validates the arguments before anything else happens (no
// database connection for a malformed call).
func ParseArgs(args []string) (Args, error) {
	fs := flag.NewFlagSet("create-staff", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	email := fs.String("email", "", "staff email (login)")
	name := fs.String("name", "", "display name shown to colleagues")
	role := fs.String("role", string(staff.RoleManager), "manager or admin")
	if err := fs.Parse(args); err != nil || fs.NArg() > 0 {
		return Args{}, fmt.Errorf("%s", Usage)
	}
	if strings.TrimSpace(*email) == "" || strings.TrimSpace(*name) == "" {
		return Args{}, fmt.Errorf("%s", Usage)
	}
	return Args{Email: *email, Name: *name, Role: staff.Role(strings.TrimSpace(*role))}, nil
}

// Run asks for the password and creates the account.
func Run(ctx context.Context, args Args, creator Creator, readPassword PasswordReader, out io.Writer) error {
	password, err := readPassword("Пароль (не короче 12 символов): ")
	if err != nil {
		return err
	}
	if msg := staffauth.ValidatePassword(password); msg != "" {
		return fmt.Errorf("пароль не подходит: %s", msg)
	}
	confirm, err := readPassword("Повторите пароль: ")
	if err != nil {
		return err
	}
	if confirm != password {
		return errors.New("пароли не совпадают")
	}

	user, err := creator.CreateStaff(ctx, staffauth.CreateStaffInput{
		Email:       args.Email,
		DisplayName: args.Name,
		Role:        args.Role,
		Password:    password,
	})
	if err != nil {
		return describe(err)
	}

	fmt.Fprintf(out, "Сотрудник создан: %s (%s), роль %s, id %s\n", user.Email, user.DisplayName, user.Role, user.ID)
	return nil
}

// describe turns service errors into readable CLI messages without
// internal details.
func describe(err error) error {
	var appErr *apperr.Error
	if !errors.As(err, &appErr) {
		return err
	}
	if len(appErr.Fields) == 0 {
		return errors.New(appErr.Message)
	}
	parts := make([]string, 0, len(appErr.Fields))
	for field, msg := range appErr.Fields {
		parts = append(parts, field+": "+msg)
	}
	return fmt.Errorf("%s (%s)", appErr.Message, strings.Join(parts, "; "))
}

// readLine reads one line, without the trailing newline.
func readLine(r *bufio.Reader) (string, error) {
	line, err := r.ReadString('\n')
	if err != nil && !(errors.Is(err, io.EOF) && line != "") {
		return "", err
	}
	return strings.TrimRight(line, "\r\n"), nil
}

// stdinReader is shared so both prompts read from the same buffer.
var stdinReader = bufio.NewReader(os.Stdin)
