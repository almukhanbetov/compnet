//go:build !linux

package staffcli

import "errors"

// TerminalPassword is only implemented for Linux, where the backend and its
// container run.
func TerminalPassword(string) (string, error) {
	return "", errors.New("create-staff поддерживается только в Linux (запустите в контейнере backend)")
}
