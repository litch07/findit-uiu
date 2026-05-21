@extends('emails.layout')

@section('title', $claim->relationship_type === 'found_it' ? 'Found report submitted' : 'New claim submitted')

@section('content')
<h1 style="margin:0 0 16px;font-size:24px;color:#111827;">{{ $claim->relationship_type === 'found_it' ? 'Someone may have found your item' : 'New claim on your report' }}</h1>
<p style="margin:0 0 16px;line-height:1.6;">Hello {{ $itemOwner->name }},</p>
<p style="margin:0 0 16px;line-height:1.6;">{{ $claimer->name }} {{ $claim->relationship_type === 'found_it' ? 'says they may have found' : 'submitted a claim for' }} your report: <strong>{{ $item->title }}</strong>.</p>
<p style="margin:0 0 8px;line-height:1.6;"><strong>{{ $claim->relationship_type === 'found_it' ? 'Finder message:' : 'Claim message:' }}</strong></p>
<p style="margin:0;padding:14px;background:#f8fafc;border-left:4px solid #d4590a;line-height:1.6;">{{ $claim->message }}</p>
@endsection
