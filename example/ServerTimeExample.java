import java.io.IOException;
import java.util.Date;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.http.impl.cookie.DateUtils;

@WebServlet("/serverTime")
public class ServerTimeExample extends HttpServlet
{
	private static final long serialVersionUID = 1L;

	/**
	 * Output the date in the RFC 1