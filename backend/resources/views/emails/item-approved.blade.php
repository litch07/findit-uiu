@extends('emails.layout')

@section('title', 'Report approved')

@section('content')
<h1 style="margin:0 0 16px;font-size:24px;color:#111827;">Your report was approved</h1>
<p style="margin:0 0 16px;line-height:1.6;">Hello {{ $owner->name }},</p>
<p style="margin:0;line-height:1.6;">Your FindIt report <strong>{{ $item->title }}</strong> has been approved and is now visible in the portal.</p>
@endsection
