@extends('emails.layout')

@section('title', 'Welcome to FindIt UIU')

@section('content')
<h1 style="margin:0 0 16px;font-size:24px;color:#111827;">Welcome to FindIt UIU</h1>
<p style="margin:0 0 16px;line-height:1.6;">Hello {{ $user->name }},</p>
<p style="margin:0;line-height:1.6;">Your email has been verified successfully. You can now report lost or found items, submit claims, and message other UIU users securely.</p>
@endsection
