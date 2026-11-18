<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY COLUMN payment_status ENUM('unpaid', 'paid', 'failed', 'refund_pending', 'refunded') NOT NULL DEFAULT 'unpaid'");
        }

        Schema::table('orders', function (Blueprint $table) {
            if (DB::getDriverName() === 'sqlite') {
                $table->string('payment_status', 30)->default('unpaid')->change();
            }
            $table->dateTime('refund_requested_at')->nullable()->after('paid_at');
            $table->dateTime('refunded_at')->nullable()->after('refund_requested_at');
            $table->string('refund_note', 255)->nullable()->after('refunded_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['refund_requested_at', 'refunded_at', 'refund_note']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY COLUMN payment_status ENUM('unpaid', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'unpaid'");
        }
    }
};
