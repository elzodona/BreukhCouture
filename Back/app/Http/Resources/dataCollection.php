<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class dataCollection extends ResourceCollection
{
    /**
     * Transform the resource collection into an array.
     *
     * @return array<int|string, mixed>
     */

     
    public static function RestRules(string $message , $data = [], bool $success = true, string $code) {
        return response()->json([
            "message" => $message,
            "data" => $data,
            "success" => $success,
            "status_code" => $code
        ]);
    }   

}

