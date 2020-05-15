package example;

import java.io.IOException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang3.StringUtils;

import org.apache.commons.codec.binary.Hex;

/**
 * Servlet implementation class SignerV4Example
 */
public class SignerV4Example extends HttpServlet {
	private static final long serialVersionUID = 1L;
	private static final String  SECRET_KYE = "your-secret-key";
	private static final String  REGION = "your-region";
	private static final String  SERVICE_NAME = "s3";
	
	
       
    public Sign