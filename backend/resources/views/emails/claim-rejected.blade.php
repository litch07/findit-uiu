@extends('emails.layout')

@section('title', 'Claim rejected')

@section('content')
<h1 style="margin:0 0 16px;font-size:24px;color:#111827;">Your claim was rejected</h1>
<p style="margin:0 0 16px;line-height:1.6;">Hello {{ $claimer->name }},</p>
<p style="margin:0 0 16px;line-height:1.6;">Your claim for <strong>{{ $item->title }}</strong> was rejected.</p>
<p style="margin:0;padding:14px;background:#f8fafc;border-left:4px solid #d4590a;line-height:1.6;"><strong>Reason:</strong> {{ $reason }}</p>
@endsection
