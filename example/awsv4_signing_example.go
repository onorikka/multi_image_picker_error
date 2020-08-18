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

// this example is using Marti