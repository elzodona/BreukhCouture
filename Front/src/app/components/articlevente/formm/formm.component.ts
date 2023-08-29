import { Component, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormArray, FormControl, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ImagesService } from 'src/app/services/image-service/images.service';
import { SharedBoolService } from 'src/app/services/other-fonctionnality-service/shared-bool.service';
import { IdServiceService } from 'src/app/services/other-fonctionnality-service/id-service.service';
import { Categorie } from 'src/app/interfaces/paginated-categorie.interface';
import { Breukh } from 'src/app/interfaces/breukh';
import { Article } from 'src/app/interfaces/article';
import { ForMe } from 'src/app/interfaces/for-me';
import { ArticleVente } from 'src/app/interfaces/article-vente';


@Component({
  selector: 'app-formm',
  templateUrl: './formm.component.html',
  styleUrls: ['./formm.component.css']
})
export class FormmComponent {

  @Input() categories: Categorie[] = [];
  @Input() artConfect: Article[] = [];

  @Output() getPrix = new EventEmitter();
  @Output() addArtVenteEvent = new EventEmitter<ArticleVente>();
  @Output() editArticleEvent = new EventEmitter<ArticleVente>();

  id!: number | null;
  artVenteForm!: FormGroup;
  name: string = '';
  prom: number = 0;
  ref: string = '';
  cout: number = 0;
  pv: number = 0;
  mrg: number = 0;
  archive: string = '';
  img: string = "assets/images/reunion_family.jpg";
  articlesConf: FormArray;
  suggestions:  Article[][] = [];
  recupArtConf: any;
  isEditing: boolean = false;

  ngOnInit()
  {
    this.idService.getId().subscribe(id => {
      this.id = id;
      // console.log(this.id);
    });
  }

  constructor(private fb: FormBuilder, private imageService: ImagesService, private sharedService: SharedBoolService, private idService: IdServiceService) {

    this.sharedService.editModeChanged.subscribe((isEditing: boolean) => {
      this.isEditing = isEditing;
    });

    this.artVenteForm = this.fb.group({
      libelle: ['', [Validators.required, Validators.pattern(/^[a-zA-Z][a-zA-Z0-9]*$/)]],
      categorie: [''],
      promo: [true],
      valeur: [''],
      articlesConfection: this.fb.array([
        // this.fb.group({
        //   lib: ['', [Validators.required, Validators.pattern(/^[a-zA-Z][a-zA-Z0-9]*$/)]],
        //   qte: ['', [Validators.required, Validators.pattern(/^[0-9]*$/)]]
        // })
      ]),
      photo: [this.img],
      marge: ['', [Validators.required, Validators.pattern(/^[0-9]*$/), Validators.min(5000)]],
      prixVente: ['']
    });
    this.articlesConf = this.fb.array([]);

    this.artVenteForm.get('promo')!.valueChanges
      .subscribe((promo) => {
        this.prom = promo ? 1 : 0;        
    });

    this.artVenteForm.get('libelle')!.valueChanges
      .subscribe((libelle) => {
        // const lettersOnly = /^[a-zA-Z]+$/;
        if (libelle) {
          this.ref = this.generateReference(libelle);
        } else {
          this.ref = "";
        }
      });

    this.artVenteForm.get('categorie')!.valueChanges.subscribe((categorie) => {
      if (this.ref.length === 7) {
        this.archive = categorie.toUpperCase() + '-' + this.getNumArt(categorie);

        this.updateRef(categorie, this.getNumArt(categorie));
      } else {
        if (this.ref.includes('-' + this.archive)) {
          this.ref = this.ref.replace('-' + this.archive, "");
        }
        this.archive = categorie.toUpperCase() + '-' + this.getNumArt(categorie);
        this.updateRef(categorie, this.getNumArt(categorie));
      }
    });

    this.articlesConfection.valueChanges.subscribe((articles) => {
      this.cout = 0;

      const articlesConfection = this.articlesConfection.value;
      this.recupArtConf = articlesConfection.map((article: Breukh) => {
        const libelle = article.lib;
        const qte = article.qte;
        const libs = libelle?.substring(0, 3).toLowerCase();
        return {
          libs: libelle,
          qte: qte
        };
      });
      // console.log(this.recupArtConf);

      this.recupArtConf.forEach((article: ForMe) => {
        const art = article.libs;
        const prix = this.artConfect.find(arti => arti.libelle.includes(art))?.prix;
        // console.log(prix);

        if (prix != undefined) {
          this.cout += prix * +article.qte;
        }

      });

    })

    this.artVenteForm.get('marge')!.valueChanges.subscribe((marge) => {
      this.mrg = +marge;
      this.pv = this.cout + this.mrg;

    })

  }

  updateRef(categorie: string, num: number) {
    this.ref += '-' + categorie.toUpperCase() + '-' + num;
  }

  generateReference(libelle: string) {
    return 'REF-' + libelle.slice(0, 3).toUpperCase();
  }

  getNumArt(categorie: string): number {
    const foundCategory = this.categories.find(cat => cat.libelle === categorie);
    return foundCategory ? +foundCategory.numArticles + 1 : 0;
  }

  get articlesConfection() {
    return this.artVenteForm.get('articlesConfection') as FormArray;
  }

  addArticleConfection() {
    const newArticleConfection = this.fb.group({
      lib: '',
      qte: ''
    });

    this.articlesConfection.push(newArticleConfection);
  }

  removeArticleConfection(index: number) {
    this.articlesConfection.removeAt(index);
  }

  // ...

  getLibField(index: number) {
    return this.articlesConfection.at(index).get('lib');
  }

  getQteField(index: number) {
    return this.articlesConfection.at(index).get('qte');
  }

// ...

  onLibInput(event: Event, i: number) {
    if (event.target instanceof HTMLInputElement) {
      const newValue = event.target.value;
      const searchTerm = newValue.trim().toLowerCase();

      if (searchTerm.length >= 3) {
        this.suggestions[i] = this.artConfect.filter(art =>
          art.libelle.toLowerCase().includes(searchTerm)
        );
      } else {
        this.suggestions[i] = [];
      }
    }
  }

  insertSuggestion(i:number, suggestion: Article) {    
    this.suggestions = [];

    const libelleControl = this.articlesConfection.at(i).get('lib');
    if (libelleControl) {
      libelleControl.setValue(suggestion.libelle);
    }
  }

  handleFileChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const selectedImage = inputElement.files?.[0] as File;
    this.name = selectedImage.name

    if (selectedImage) {
      this.imageService.recupImg(selectedImage).subscribe({
        next: (arg) => {
          this.img = arg as string;
          this.artVenteForm.patchValue({
            photo: this.img,
          });
        }
      });
    }
    console.log(this.name);
    console.log(this.img);
  }

  addOrEdit() {
    if (this.isEditing) {
      this.editArticle();
    } else {
      this.ajouter();
    }
  }

  ajouter() {

    const article: ArticleVente = {
      id: null,
      libelle: this.artVenteForm.value.libelle,
      promo: this.prom,
      valeur: this.artVenteForm.value.valeur,
      marge: this.artVenteForm.value.marge,
      categorie_libelle: this.artVenteForm.value.categorie,
      articlesConfection: this.recupArtConf,
      photo: this.name,
      photo_name: this.img
    };
    // console.log(article);
    this.addArtVenteEvent.emit(article);
    //this.artVenteForm.reset();
  }
      
  editArticle() {
    const article: ArticleVente = {
      id: this.id,
      libelle: this.artVenteForm.value.libelle,
      promo: this.prom,
      valeur: this.artVenteForm.value.valeur,
      marge: this.artVenteForm.value.marge,
      categorie_libelle: this.artVenteForm.value.categorie,
      articlesConfection: this.recupArtConf,
      photo: this.name,
      photo_name: this.img
    };
    this.editArticleEvent.emit(article);
    // console.log(article);
    //this.artVenteForm.reset();
    this.isEditing = false;
  }    



}
