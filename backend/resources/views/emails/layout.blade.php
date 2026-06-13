<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'FindIt UIU')</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#f97316,#d4590a);padding:28px 32px;color:#ffffff;">
                            <div style="display:flex;align-items:center;gap:12px;">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="44" height="44" id="findit-professional-mark">
                                  <g transform="rotate(-45 50 50)">
                                    <path d="M 76 38.5 A 26 26 0 1 0 24 38.5 C 24 56.5 34 72.5 48 86.5 A 2.8 2.8 0 0 0 52 86.5 C 66 72.5 76 56.5 76 38.5 Z M 50 24.5 A 14 14 0 1 1 50 52.5 A 14 14 0 1 1 50 24.5 Z" fill="#FFFFFF" fill-rule="evenodd" />
                                    <circle cx="50" cy="38.5" r="5" fill="#1B2A4A" />
                                  </g>
                                </svg>
                                <div style="font-size:28px;font-weight:800;letter-spacing:.2px;">FindIt UIU</div>
                            </div>
                            <div style="margin-top:6px;font-size:14px;opacity:.92;">United International University Lost and Found Portal</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            @yield('content')
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#0f172a;color:#cbd5e1;padding:24px 32px;font-size:13px;line-height:1.6;">
                            <strong style="color:#ffffff;">United International University</strong><br>
                            United City, Madani Avenue, Dhaka, Bangladesh<br>
                            &copy; 2026 FindIt UIU. All rights reserved.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
