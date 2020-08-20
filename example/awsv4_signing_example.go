// You need to import the following:
import (
	"crypto/hmac"
	"crypto/sha256"
	"fmt"
	"log"
	"net/http"
	"strings"
)

var (
	date        string
	regionName  string
	serviceName string
	requestName string
)

// this example is using Martini
m.Get("/sign_auth", func(w http.ResponseWriter, r *http.Request) {
    // Todo: Authenticate the request	log.Println("signing")
	qs := req.URL.Query()

	strs := strings.Split(qs.Get("to_sign"), "\n")
	data := strings.Split(strs[2], "/")
	date, regionName, serviceName, requestName = data