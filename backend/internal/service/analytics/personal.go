package analytics

import (
	"regexp"
	"strings"
	"unicode"
)

// UTM values are free text from a URL anyone can build or share, so a link
// may carry an email, a phone number or an ID. LooksPersonal recognises the
// obvious cases; such a value is dropped (CleanText), never stored. The
// rules are deliberately narrow so ordinary tags survive: names, dates
// ("2026-10-22-1530"), Google Ads ValueTrack ids ("{campaignid}",
// "21345678901"). The browser applies the same rules before keeping a
// value (frontend/lib/analytics/tracker.ts).

var (
	emailPattern = regexp.MustCompile(`[^\s@]+@[^\s@]+\.[^\s@]{2,}`)
	// A run of digits, possibly with phone-style separators or a leading +.
	digitRunPattern = regexp.MustCompile(`\+?\d[\d\s().\-]*\d`)
)

// LooksPersonal reports a value that looks like an email, a web address,
// a phone number (Kazakhstan / Russia, or any number written with "+"),
// a Kazakh IIN or a payment card number.
func LooksPersonal(value string) bool {
	v := strings.ToLower(value)
	if emailPattern.MatchString(v) || strings.Contains(v, "://") || strings.HasPrefix(v, "www.") {
		return true
	}
	for _, run := range digitRunPattern.FindAllString(v, -1) {
		digits := onlyDigits(run)
		n := len(digits)
		formatted := strings.ContainsAny(run, " ().-")
		switch {
		case strings.HasPrefix(run, "+") && n >= 10:
			return true
		case formatted && n == 11 && (digits[0] == '7' || digits[0] == '8'):
			return true // 8 (700) 000-00-01
		case formatted && n == 10 && digits[0] == '7':
			return true // 700 000 00 01
		case !formatted && n == 11 && (digits[0] == '7' || digits[0] == '8') && (digits[1] == '7' || digits[1] == '9'):
			return true // 77000000001: KZ (7 7xx) or RU (7 9xx) mobile
		case !formatted && n == 12 && validIIN(digits):
			return true
		case !formatted && n == 16 && luhn(digits):
			return true
		}
	}
	return false
}

func onlyDigits(s string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsDigit(r) {
			return r
		}
		return -1
	}, s)
}

// validIIN checks a Kazakh individual identification number: YYMMDD, a
// century/sex digit 1–6, and the official check digit.
func validIIN(d string) bool {
	month := int(d[2]-'0')*10 + int(d[3]-'0')
	day := int(d[4]-'0')*10 + int(d[5]-'0')
	if month < 1 || month > 12 || day < 1 || day > 31 || d[6] < '1' || d[6] > '6' {
		return false
	}
	check := func(weights [11]int) int {
		sum := 0
		for i, w := range weights {
			sum += int(d[i]-'0') * w
		}
		return sum % 11
	}
	c := check([11]int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11})
	if c == 10 {
		c = check([11]int{3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2})
	}
	return c != 10 && c == int(d[11]-'0')
}

// luhn is the payment card checksum.
func luhn(d string) bool {
	sum := 0
	for i := len(d) - 1; i >= 0; i-- {
		n := int(d[i] - '0')
		if (len(d)-1-i)%2 == 1 {
			n *= 2
			if n > 9 {
				n -= 9
			}
		}
		sum += n
	}
	return sum%10 == 0
}
