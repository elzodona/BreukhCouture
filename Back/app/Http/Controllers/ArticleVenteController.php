<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreArticleVenteRequest;
use App\Http\Requests\UpdateArticleVenteRequest;
use App\Models\ArticleVente;
use App\Models\Breukh;
use App\Models\Article;
use App\Http\Resources\ArticleVenteResource;
use App\Http\Resources\ArticleVenteCollection;
use App\Http\Resources\dataCollection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Http\Resources\ArticleResource;
use Illuminate\Support\Facades\Storage;
use App\Models\Categorie;
use Illuminate\Http\Request;


class ArticleVenteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $articles = ArticleVente::paginate(2);
        return new ArticleVenteCollection($articles);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        return DB::transaction(function () use ($request) {
        
            $article = new ArticleVente();
            
            $cat = Categorie::where('libelle', $request['categorie_libelle'])->first();
            if (!$cat) {
                throw new \Exception('Catégorie introuvable');
            }
            $article->categorie_id = $cat->id;
            $article->libelle = $request['libelle'];
            $article->promo = $request['promo'];
            if ($request['promo'] == 1) {
                $article->valeur = $request['valeur']; 
            }
            
            $article->qteStock = 20;

            $imagePath = str_replace('data:image/jpeg;base64,', '', $request->photo_name);
            $fileName = $request->photo;

            if (Storage::disk('public')->put($fileName, base64_decode($imagePath))) {
                $article->photo = $fileName;
            } else {
                throw new \Exception('Erreur lors de l\'insertion de l\'image');
            }
            
            $libellePrefix = substr($article->libelle, 0, 3);
            $categorieText = $article->categorie->libelle;
            $orderNumber = $article->categorie->numArticles + 1;
            $reference = "REF-$libellePrefix-$categorieText-$orderNumber";
            $article->reference = $reference;

            $cat->update(['numArticles' => $orderNumber]);

            $cout = 0;
            
            if ( count($request['articlesConfection']) < 3 ){
                return response()->json(['message' => 'Articles de confection fourni insuffisants']);
            }

            $requiredConfections = ["tis", "bou", "fil"];
            $cateFourni = [];
            foreach ($request['articlesConfection'] as $value) {
                $catego = key($value);
                $libelle = substr($value[$catego], 0, 3);
                $cateFourni[] = $libelle;
            }
            
            $missingConfections = array_diff($requiredConfections, $cateFourni);

            if (!empty($missingConfections)) {
               return response()->json(['message' => 'Il manque des categories de confection', 'data'=>$missingConfections]); 
            }

            foreach ($request['articlesConfection'] as $confectionItem) {
                $key = key($confectionItem);
                $articleName = $confectionItem[$key];
                $quantity = $confectionItem['qte'];
                
                $articleConf = Article::where('libelle', $articleName)->first();

                if ($quantity > $articleConf->stock) {
                    throw new \Exception('Le stock disponible est insuffisant');
                }
                $cout += $articleConf->prix * $quantity;
                $articleConf->update(['stock' => $articleConf->stock - $quantity]);
            }
            $article->cout = $cout;
            $article->marge = $request['marge'];
            $article->prix_vente = $cout + $request['marge'];

            $article->save();

            foreach ($request['articlesConfection'] as $confectionItem) {
                $key = key($confectionItem);
                $articleName = $confectionItem[$key];
                $quantity = $confectionItem['qte'];

                $articleConf = Article::where('libelle', $articleName)->first();
                
                $breukh = new Breukh();
                $breukh->qte = $quantity;
                $breukh->article_id = $articleConf->id;
                $breukh->article_vente_id = $article->id;
                $breukh->save();
            }            

            return dataCollection::RestRules(
                "article de vente ajouté avec succès", 
                $article, 
                true,
                200
            );
        });
    }

    /**
     * Update the specified resource in storage.
     */

    public function update(Request $request, $articleVenteId)
    {
        $article = ArticleVente::find($articleVenteId);

        $article->update(['libelle' => $request->libelle]);
        $article->update(['promo' => $request->promo]);
        if ($request->input('promo') == 1) {
            $article->update(['valeur' => $request->valeur]);
        }

        if (count($request->articlesConfection) < 3 ) {
            return response()->json(['message' => 'Articles de confection fournis insuffisants'], 400);
        }

       $requiredConfections = ["tis", "bou", "fil"];
        $cateFourni = [];
        foreach ($request['articlesConfection'] as $value) {
            $catego = key($value);
            $libelle = substr($value[$catego], 0, 3);
            $cateFourni[] = $libelle;
        }
        $missingConfections = array_diff($requiredConfections, $cateFourni);

        if (!empty($missingConfections)) {
            return response()->json(['message' => 'Il manque des categories de confection', 'data'=>$missingConfections]); 
        }

        $cout = 0;

        foreach ($request->articlesConfection as $confectionItem) {
            $key = key($confectionItem);
            $articleName = $confectionItem[$key];
            $quantity = $confectionItem['qte'];

            $articleConf = Article::where('libelle', $articleName)->first();

            if ($quantity > $articleConf->stock) {
                throw new \Exception('Le stock disponible est insuffisant');
            }

            $cout += $articleConf->prix * $quantity;
            $articleConf->decrement('stock', $quantity);
        }

        $article->cout = $cout;
        $article->update(['marge' => $request->marge]);
        $article->update(['prix_vente' => $cout + $request->marge]);

        $article->save();
        $article->article()->detach();

        foreach ($request['articlesConfection'] as $confectionItem) {
            $key = key($confectionItem);
            $articleName = $confectionItem[$key];
            $quantity = $confectionItem['qte'];

            $articleConf = Article::where('libelle', $articleName)->first();
            
            $breukh = new Breukh();
            $breukh->qte = $quantity;
            $breukh->article_id = $articleConf->id;
            $breukh->article_vente_id = $article->id;
            $breukh->save();
        }   

            return dataCollection::RestRules(
                "article de vente modifié avec succès", 
                $article, 
                true,
                200
            );
   
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($articleId)
    {
        return DB::transaction(function () use ($articleId) {
            
            $article = ArticleVente::findOrFail($articleId);
            $article->article()->detach();
            $article->delete();

            return response()->json(
                [
                    'message' => 'Article supprimé avec succès', 
                    'data'=>$article, 
                    'status' => 200
                ]);
        });
    }

}

