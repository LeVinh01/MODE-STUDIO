<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Unpaid        = 'unpaid';
    case Paid          = 'paid';
    case Failed        = 'failed';
    case RefundPending = 'refund_pending';
    case Refunded      = 'refunded';
}
