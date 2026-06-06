@extends('emails.layout')

@section('title', 'Reset Your FindIt UIU Password')

@section('content')
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Hi {{ $user->name }},</p>

<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#374151;">
    You requested a password reset for your <strong>FindIt UIU</strong> account. Click the button below to set a new password.
</p>

<p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
    This link expires in <strong>60 minutes</strong>. If you did not request this, you can safely ignore this email — your account will remain secure.
</p>

<div style="text-align:center;margin-bottom:32px;">
    <a href="{{ $resetUrl }}"
       style="display:inline-block;background:linear-gradient(135deg,#f97316,#d4590a);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.2px;">
        Reset My Password
    </a>
</div>

<p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.6;">
    If the button above does not work, copy and paste the following URL into your browser:
</p>
<p style="margin:0;font-size:13px;color:#d4590a;word-break:break-all;">
    {{ $resetUrl }}
</p>
@endsection
