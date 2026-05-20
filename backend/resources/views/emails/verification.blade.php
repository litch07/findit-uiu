@extends('emails.layout')

@section('title', 'Verify your FindIt UIU account')

@section('content')
@php($verificationUrl = 'http://localhost:8000/api/auth/verify-email/'.$token.'?email='.urlencode($user->email))
<h1 style="margin:0 0 16px;font-size:24px;color:#111827;">Verify your email</h1>
<p style="margin:0 0 16px;line-height:1.6;">Hello {{ $user->name }},</p>
<p style="margin:0 0 24px;line-height:1.6;">Please verify your email address to activate your FindIt UIU account. This link expires in 24 hours.</p>
<p style="margin:0 0 24px;">
    <a href="{{ $verificationUrl }}" style="display:inline-block;background:#d4590a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">Verify Email</a>
</p>
<p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">If the button does not work, open this link:<br>{{ $verificationUrl }}</p>
@endsection
