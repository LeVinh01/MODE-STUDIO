<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending   = 'pending';
    case Confirmed = 'confirmed';
    case Shipping  = 'shipping';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
}
