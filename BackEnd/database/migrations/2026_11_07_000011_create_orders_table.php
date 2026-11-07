<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code', 50)->unique();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->enum('status', ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'])
                  ->default('pending');
            $table->enum('payment_method', ['cod', 'vnpay']);
            $table->enum('payment_status', ['unpaid', 'paid', 'failed', 'refunded'])
                  ->default('unpaid');
            $table->string('recipient_name', 150);
            $table->string('recipient_phone', 20);
            $table->string('shipping_address', 500);
            $table->text('note')->nullable();
            $table->decimal('subtotal', 12, 0);
            $table->decimal('shipping_fee', 12, 0)->default(0);
            $table->decimal('discount_amount', 12, 0)->default(0);
            $table->decimal('total_amount', 12, 0);
            $table->string('cancel_reason', 500)->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
