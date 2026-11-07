<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('variant_id')->constrained('product_variants')->restrictOnDelete();
            // Snapshot thông tin tại thời điểm đặt hàng (tránh ảnh hưởng khi sản phẩm thay đổi)
            $table->string('product_name', 200);
            $table->string('sku', 100);
            $table->string('color_name', 50);
            $table->string('size_name', 20);
            $table->string('image_url', 500)->nullable();
            $table->decimal('unit_price', 12, 0);
            $table->unsignedInteger('quantity');
            $table->decimal('line_total', 12, 0); // unit_price * quantity
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
