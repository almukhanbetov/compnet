//go:build linux

package staffcli

import (
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"golang.org/x/sys/unix"
)

// TerminalPassword reads a password from the controlling terminal with
// echo disabled, restoring the terminal afterwards (also on Ctrl+C). It
// refuses to run when stdin is not a terminal, so a password can't end up
// in shell history through a pipe or here-string.
func TerminalPassword(prompt string) (string, error) {
	fd := int(os.Stdin.Fd())
	original, err := unix.IoctlGetTermios(fd, unix.TCGETS)
	if err != nil {
		return "", errors.New("нужен интерактивный терминал: запустите команду в терминале (docker exec -it ...)")
	}

	silent := *original
	silent.Lflag &^= unix.ECHO
	silent.Lflag |= unix.ICANON | unix.ISIG
	if err := unix.IoctlSetTermios(fd, unix.TCSETS, &silent); err != nil {
		return "", fmt.Errorf("не удалось отключить отображение ввода: %w", err)
	}

	interrupted := make(chan os.Signal, 1)
	signal.Notify(interrupted, syscall.SIGINT, syscall.SIGTERM)
	done := make(chan struct{})
	go func() {
		select {
		case <-interrupted:
			_ = unix.IoctlSetTermios(fd, unix.TCSETS, original)
			fmt.Fprintln(os.Stderr)
			os.Exit(130)
		case <-done:
		}
	}()
	defer func() {
		close(done)
		signal.Stop(interrupted)
		_ = unix.IoctlSetTermios(fd, unix.TCSETS, original)
		fmt.Fprintln(os.Stderr) // the user's Enter was not echoed
	}()

	fmt.Fprint(os.Stderr, prompt)
	return readLine(stdinReader)
}
