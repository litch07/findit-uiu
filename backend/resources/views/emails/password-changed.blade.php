@extends('emails.layout')

@section('title', 'Password changed')

@section('content')
<h1 style="margin:0 0 16px;font-size:24px;color:#111827;">Password changed</h1>
<p style="margin:0 0 16px;line-height:1.6;">Hello {{ $user->name }},</p>
<p style="margin:0 0 16px;line-height:1.6;">Your FindIt UIU password was changed.</p>
<p style="margin:0;line-height:1.6;"><strong>Device:</strong> {{ $device }}</p>
@endsection
