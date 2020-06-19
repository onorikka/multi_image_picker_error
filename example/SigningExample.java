
import java.io.IOException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.codec.binary.Base64;
import org.apache.commons.lang3.StringUtils;

@WebServlet("/signAuth")
public class SigningExample extends HttpServlet
{
    private static final long   serialVersionUID    = 1L;

    private static final String HMAC_SHA1_ALGORITHM = "HmacSHA1";

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
        // TODO: Do something to authenticate this request
        String data = request.getParameter("to_sign");
