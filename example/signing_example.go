// You need to import the following:
import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	)

// this example is using Martini
m.Get("/sign_auth", func(w http.ResponseWriter, r *