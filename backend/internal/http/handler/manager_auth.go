package handler

import (
	"context"
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/http/apierr"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/http/middleware"
	"github.com/almukha/compnet-backend/internal/http/response"
	"github.com/almukha/compnet-backend/internal/service/staffauth"
)

// ManagerAuthService is what this handler needs from the auth service.
type ManagerAuthService interface {
	Login(ctx context.Context, in staffauth.LoginInput) (staffauth.LoginResult, error)
	Logout(ctx context.Context, token string) error
}

// ManagerCookieSettings are the configurable attributes of the manager
// session cookie. SameSite is always Strict.
type ManagerCookieSettings struct {
	Secure bool
}

// ManagerAuthHandler serves login, logout and the current user.
type ManagerAuthHandler struct {
	service ManagerAuthService
	cookie  ManagerCookieSettings
}

// NewManagerAuthHandler wires the handler.
func NewManagerAuthHandler(service ManagerAuthService, cookie ManagerCookieSettings) *ManagerAuthHandler {
	return &ManagerAuthHandler{service: service, cookie: cookie}
}

// Login handles POST /api/v1/manager/auth/login.
func (h *ManagerAuthHandler) Login(c *gin.Context) {
	var req dto.ManagerLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return
	}

	current, _ := c.Cookie(middleware.ManagerCookieName)
	result, err := h.service.Login(c.Request.Context(), staffauth.LoginInput{
		Email:        req.Email,
		Password:     req.Password,
		ClientIP:     c.ClientIP(),
		CurrentToken: current,
	})
	if err != nil {
		apierr.Write(c, err)
		return
	}

	h.setCookie(c, result.Token, result.ExpiresAt)
	response.OK(c, dto.ManagerSessionResponse{
		User:      dto.NewStaffUserResponse(result.User),
		ExpiresAt: result.ExpiresAt,
	})
}

// Logout handles POST /api/v1/manager/auth/logout: it revokes the session
// (if any) and clears the cookie. Always 204, so it is safe to repeat.
func (h *ManagerAuthHandler) Logout(c *gin.Context) {
	token, _ := c.Cookie(middleware.ManagerCookieName)
	if err := h.service.Logout(c.Request.Context(), token); err != nil {
		apierr.Write(c, err)
		return
	}
	h.clearCookie(c)
	c.Status(http.StatusNoContent)
}

// Me handles GET /api/v1/manager/auth/me.
func (h *ManagerAuthHandler) Me(c *gin.Context) {
	user, ok := middleware.StaffFromContext(c)
	if !ok {
		apierr.Write(c, apperr.Unauthorized("требуется вход"))
		return
	}
	response.OK(c, dto.NewStaffUserResponse(user))
}

func (h *ManagerAuthHandler) setCookie(c *gin.Context, token string, expiresAt time.Time) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     middleware.ManagerCookieName,
		Value:    token,
		Path:     middleware.ManagerCookiePath,
		Expires:  expiresAt,
		MaxAge:   int(math.Round(time.Until(expiresAt).Seconds())),
		Secure:   h.cookie.Secure,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
}

func (h *ManagerAuthHandler) clearCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     middleware.ManagerCookieName,
		Value:    "",
		Path:     middleware.ManagerCookiePath,
		MaxAge:   -1,
		Secure:   h.cookie.Secure,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
}
