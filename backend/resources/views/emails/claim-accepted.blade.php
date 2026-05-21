@extends('emails.layout')

@section('title', 'Claim accepted')

@section('content')
<h1 style="margin:0 0 16px;font-size:24px;color:#111827;">Your claim was accepted</h1>
<p style="margin:0 0 16px;line-height:1.6;">Hello {{ $claimer->name }},</p>
<p style="margin:0 0 16px;line-height:1.6;">Your claim for <strong>{{ $item->title }}</strong> was accepted by {{ $itemOwner->name }}.</p>
@if($claim->preferred_location)
<p style="margin:0;line-height:1.6;"><strong>Preferred handover location:</strong> {{ $claim->preferred_location }}</p>
@endif
@endsection
