<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;


class ArticleVente extends Model
{
    use HasFactory, SoftDeletes;
    
    protected $fillable=["promo", "valeur", "categorie_id", "cout", "marge", "prix_vente", "reference", "photo"];
    
    public function article()
    {
        return $this->belongsToMany(Article::class, 'breukhs', 'article_vente_id', 'article_id')
                    ->withPivot('qte');
    }
    
    public function categorie()
    {
        return $this->belongsTo(Categorie::class);
    }

}

