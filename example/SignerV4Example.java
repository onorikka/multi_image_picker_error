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
	pri