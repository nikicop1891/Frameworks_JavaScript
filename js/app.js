  function Color1(color){
    $(color).animate({color:"red"},2000,function(){
      Color2(color)})   }

  function Color2(color){
    $(color).animate({color:"blue"},2000,function(){
      Color1(color)})   }

  /*function llenarCuadro(){
    for (var i=1;i<8; i++){
      for(var j=1;j<8;j++){
      if($(".col-"+j).children("img:nth-child("+i+")").html()==null){
      numero=Math.floor(Math.random() * 4) + 1 ;
      imagen="image/"+numero+".png";
      $(".col-"+j).prepend("<img src="+imagen+" class='elemento'/>")/*.css("justify-content","flex-start")
      }}}
  }*/

$(document).ready(function(){
/*$(".buttons").click(function(){
});*/
Color1($("h1"));
/*llenarCuadro();
$( ".elemento").droppable({
   drop: function( event, ui ) {
     $( this ).addClass( "ui-state-highlight" );
     $(this).animate({left:"-=95"},1000)
   }
 });*/
 $(document).mousemove(function(event){
         	$("#t1").text("Coordenadas actual: " + event.pageX + ", " + event.pageY);
     	});
});

var nivel = {
	x: 0,							// Position X de la grille dans le canvas - X posición de la cuadrícula en el lienzo
	y: 0,							// Position Y de la grille dans le canvas
	tailleX: 7,					// Nombre de colonnes de la grille
	tailleY: 7,					// Nombre de lignes de la grille
	tailleCase: 115,					// Taille (en px) de chaque case - tamaño de la caja (Altura (px) de cada cuadro)
	grille: [],						// Grille du jeu
	finDuJeu: 0,					// 0 si le jeu est encore en cours, 1 si le jeu est gagné, 2 si le jeu est perdu
	nbCoups: 0,						// Nombre d'actions effectuées par le joueur
	score: 0,						// Score du joueur : +60 à chaque case détruite
	caseADeplacer: {x: -1, y: -1}	// Case sélectionnée : à {-1, -1} si aucune
};

/** Pour connaître le score d'avant afin d'afficher la barre de progression correctement **/
var scorePrec = 0;

/** Pour savoir si un échange est en cours **/
var echangeEnCours = false;
/** ID de l'échange **/
var idDepl;

/** Coordonnées du clic dans la zone de jeu (relatives au canvas) **/
var clic = { x: -1, y: -1 };

/** Grille de destruction pour connaître les cases à détruire **/
var grilleDeDestruction = new Array();

/** Pour se souvenir des cases échangées pour le cas où il faut les rééchanger **/
var cs1, cs2;

/** Indique si on veut rééchanger les cases **/
var reechanger = false;

/** Indique si on veut 'casser' des cases (après un échange) **/
var casser = false;

/** Indique si un coup est en cours **/
var enCours = false;

/** Indique si une animation est en cours **/
var animation = false;

/** Temps précédent permettant de compter des temps **/
var tempsPrec = 0;

/** Permet d'identifier la phase d'initialisation pour le processus de remplacement **/
var initEnCours = false;

/**
 * Permet de faire avancer la barre de score
 * @param fin   Jusqu'à quel score on veut avancer
 */
function move(fin) {
    var elem = document.getElementById("bar");
    var largeur = scorePrec/6000*100;			// Transformation du score en pourcentage du max

    var id = setInterval(frame, 25);			// Pour faire avancer la barre progressivement
    function frame()
    {
        if (largeur >= fin)
        {
            clearInterval(id);
        }
        else
        {
            largeur++;
            if(largeur >= 100)					// Si on dépasse 100%, on reste à 100%
            {
                largeur = 100;
                clearInterval(id);				// Puis on arrête
            }
            elem.style.width = largeur + '%';
            document.getElementById("label").innerHTML = (largeur|0) + '%';	// On change dans l'HTML, et on tronque pour ne pas avoir de virgule
        }
    }
    scorePrec = nivel.score;					// On met à jour le scorePrec pour recommencer où on s'était arrêté la fois suivante
}

/** Chargement des images des bonbons **/
var uno = new Image();
uno.src = 'image/1.png';
var dos = new Image();
dos.src = 'image/2.png';
var tres = new Image();
tres.src = 'image/3.png';
var cuatro = new Image();
cuatro.src = 'image/4.png';

/**
 * Retourne la case qui est cliquee
 * Si aucune case n'est cliquee (souris en dehors de la grille), le retour est {-1, -1}
 */
caseCliquee = function(pos)
{
    // on calcule coordonnées de la tuile
    var tx = Math.floor((pos.x - nivel.x) / nivel.tailleCase);
    var ty = Math.floor((pos.y - nivel.y) / nivel.tailleCase);

    // on vérifie si la tuile est valide
     if (tx >= 0 && tx < nivel.tailleX && ty >= 0  && ty < nivel.tailleY) // La tuile est valide
        return { x: tx, y: ty };
    else //tuile non valide
        return{ x: -1, y: -1 };
}

/**
 * Fonction qui regarde si deux cases sont côtes à côtes
 *
 * @param case1     La première case
 * @param case2     La seconde case
 * @return boolean  vrai si les cases sont adjacentes
 */
sontAdjacentes = function(case1, case2)
{
    //on vérifie si la tuile est sur une case adjacente (à côté) de la tuile selectionnée
    if ((Math.abs(case1.x - case2.x) == 1 && case1.y == case2.y) ||  (Math.abs(case1.y - case2.y) == 1 && case1.x == case2.x))
        return true;
    else
        return false;
}

/**
 * Echange les valeurs de deux cases et anime cet échange
 *
 * @param case1   Première case
 * @param case2   Seconde case
 */
echanger = function(case1, case2)
{
    var enX = false;
    var enY = false;

    var pos1, pos2;

    if(!echangeEnCours)
    {
        // Déplacement en X ou en Y : On ne peut pas déplacer de cases en diagonale...
        if(nivel.grille[case1.x][case1.y].x != nivel.grille[case2.x][case2.y].x)
        {
            pos1 = nivel.grille[case1.x][case1.y].x;
            pos2 = nivel.grille[case2.x][case2.y].x;
            enX = true;
			moveSound();
        }
        else
        {
            pos1 = nivel.grille[case1.x][case1.y].y;
            pos2 = nivel.grille[case2.x][case2.y].y;
            enY = true;
			moveSound();
        }

        var temp = nivel.grille[case1.x][case1.y];
        nivel.grille[case1.x][case1.y] = nivel.grille[case2.x][case2.y];
        nivel.grille[case2.x][case2.y] = temp;

        clearInterval(idDepl);
        echangeEnCours = true;
        idDepl = setInterval(depl, 25, case1, case2, enX, enY, pos1, pos2);
    }
}

/**
 * Anime l'échange de deux cases
 *
 * @param case1		Première case
 * @param case2		Seconde case
 * @param enX		Indique si le déplacement s'effectue horizontalement
 * @param enY		Indique si le déplacement s'effectue verticalement
 * @param pos1		Position de la première case
 * @param pos2		Position de la seconde case
 */
depl = function(case1, case2, enX, enY, pos1, pos2)
{
    if(enX && nivel.grille[case1.x][case1.y].x > pos1)
    {
        nivel.grille[case1.x][case1.y].x -= 5;
        nivel.grille[case2.x][case2.y].x += 5;
    }
    else if(enX && nivel.grille[case1.x][case1.y].x < pos1)
    {
        nivel.grille[case1.x][case1.y].x += 5;
        nivel.grille[case2.x][case2.y].x -= 5;
    }
    else if(enY && nivel.grille[case1.x][case1.y].y > pos1)
    {
        nivel.grille[case1.x][case1.y].y -= 5;
        nivel.grille[case2.x][case2.y].y += 5;
    }
    else if(enY && nivel.grille[case1.x][case1.y].y < pos1)
    {
        nivel.grille[case1.x][case1.y].y += 5;
        nivel.grille[case2.x][case2.y].y -= 5;
    }
    else
    {
        echangeEnCours = false;
        clearInterval(idDepl);
    }
}

/**
 * Vérifie la validité d'une case
 * @param cs 	la case à vérifier
 */
estValide = function(cs)
{
    if( cs.x >= 0 && cs.x < nivel.tailleX && cs.y >= 0 && cs.y < nivel.tailleY && nivel.grille[cs.x][cs.y].couleur != 0 && nivel.grille[cs.x][cs.y].couleur != -1)
        return true;
    else
        return false;
}

/**
 * Creation de la grille de destruction
 */
creerGrilleDeDestruction = function()
{
    for(i = 0; i < nivel.tailleX; i++)
    {
        grilleDeDestruction[i] = new Array();
    }
}

/**
 * Remplit la grille de destruction par des valeurs fausses
 */
remplirGrilleDeDestruction = function()
{
    for(j = 0; j < nivel.tailleY; j++)
    {
        for(i = 0; i < nivel.tailleX; i++)
        {
            grilleDeDestruction[i][j] = false;
        }
    }
}

/**
 * Creer la grille principale
 */
creerGrille = function()
{
    for(i = 0; i < nivel.tailleX; i++)
    {
        nivel.grille[i] = new Array();
    }
}

/**
 *  Remplissage de la grille
 */
remplirGrille = function()
{
    for(j = 0; j < nivel.tailleY; j++)
    {
        for(i = 0; i < nivel.tailleX; i++)
        {
            nivel.grille[i][j] = { x: 0, y: 0, couleur: 0 };	// Chaque case contient sa valeur et sa position

            nivel.grille[i][j].x = i * nivel.tailleCase;		// Position en x de la case
            nivel.grille[i][j].y = j * nivel.tailleCase;		// Position en y de la case

            nivel.grille[i][j].couleur = rand(0, 5)|0; 		// Pour avoir des entiers
            if(nivel.grille[i][j].couleur == 0) 				// Pour avoir moins de cases vides
                nivel.grille[i][j].couleur = rand(0, 5)|0;
        }
    }
}

/**
 * Affichage d'un texte centre autour du point indiqué
 *
 * @param text 		Le texte à afficher
 * @param x 		La position en x
 * @param width     La largeur dans laquelle on veut centrer le texte
 */
drawCenterText = function(text, x, y, width) {
    var textDim = context.measureText(text);
    context.fillText(text, x + (width - textDim.width) / 2, y);
}

/**
 * Affichage de la grille (lignes verticales et horizontales)
 */
affichageGrille = function()
{
    // Lignes verticales
    for(i = 0; i <= nivel.tailleX; i++)
    {
        context.fillRect(nivel.tailleCase*(i) + nivel.x, nivel.y, 1, nivel.tailleY * nivel.tailleCase);
    }
    // Lignes horizontales
    for(j = 0; j <= nivel.tailleY; j++)
    {
        context.fillRect(nivel.x, nivel.tailleCase*(j) + nivel.y, nivel.tailleX * nivel.tailleCase, 1);
    }
}

/**
 * affichage des cases a detruire (surlignées en rouge)
 */
affichageCasesADetruire = function()
{
    for(j = 0; j < nivel.tailleY; j++)
    {
        for(i = 0; i < nivel.tailleX; i++)
        {
            if(grilleDeDestruction[i][j] == true)
            {
                context.fillStyle="rgba(255, 0, 0, 0.3)";
                context.fillRect(nivel.tailleCase*i + nivel.x, nivel.tailleCase*j + nivel.y, nivel.tailleCase, nivel.tailleCase);
            }
        }
    }
}

/**
 * Affichage des bonbons
 */
affichageBonbons = function()
{
    for(j = 0; j < nivel.tailleY; j++)
    {
        for(i = 0; i < nivel.tailleX; i++)
        {
            couleurBonbon(nivel.grille[i][j]);  // Afficher les bonbons correspondant à la valeur de la case
        }
    }
}

/**
 * Traçage des bonbons (les images)
 *
 * @param caseEnCours	La case à afficher
 */
couleurBonbon = function(caseEnCours){
    switch(caseEnCours.couleur)
    {
    	// Case inutilisable
        case 0:
            context.drawImage(uno, nivel.x + caseEnCours.x+1, nivel.y + caseEnCours.y+1, nivel.tailleCase-2, nivel.tailleCase-2);
            break;
        // Case rouge
        case 1:
            context.drawImage(dos, nivel.x + caseEnCours.x+1, nivel.y + caseEnCours.y+1, nivel.tailleCase-2, nivel.tailleCase-2);
            break;
        case 2:
            context.drawImage(tres, nivel.x + caseEnCours.x+1, nivel.y + caseEnCours.y+1, nivel.tailleCase-2, nivel.tailleCase-2);
            break;
        case 3:
            context.drawImage(cuatro, nivel.x + caseEnCours.x+1, nivel.y + caseEnCours.y+1, nivel.tailleCase-2, nivel.tailleCase-2);
            break;
        // Case combo
        default:
           	console.log("Erreur dans l'affichage : case indéterminée");
            break;
    }
}

/**
 * Affichage de la case selectionnée (surlignée en noir)
 *
 * @param caseSelec 	Case sélectionnée
 */
affichageCaseSelec = function(caseSelec)
{
    context.fillStyle="rgba(0, 0, 0, 0.3)";
    context.fillRect(nivel.tailleCase*caseSelec.x + nivel.x, nivel.tailleCase*caseSelec.y + nivel.y, nivel.tailleCase, nivel.tailleCase);
}

/**
 * Petite fonction aleatoire
 *
 * @param mini 		Borne minimum
 * @param maxi 		Borne maximum
 * @return real     Réel aléatoire entre mini et maxi
 */
rand = function(mini, maxi) {
    return (Math.random()*(maxi-mini+1))+mini;
}

/**
 * Detection des bonbons a detruire
 *
 * @return boolean 		Vrai si il n'y a plus de cases à détruire
 */
detecter = function()
{
    var pasDeCasesADetruire = true;
    var couleurTemp;
    var nbCasesAlignees;
    var detruireLigne = false;
    var detruireColonne = false;

    for(j = 0; j < nivel.tailleY; j++)
    {
        couleurTemp = nivel.grille[0][j].couleur; // La couleur temporaire est égale à la première case de la grille
        if(couleurTemp != 16)
        {
            if(couleurTemp > 10)
                couleurTemp -= 5;
            if(couleurTemp > 5)
                couleurTemp -= 5;
        }
        nbCasesAlignees = 1; // Le nombre de cases alignées est égal à 1 en début de ligne

        /** Parcours des lignes **/
        for(i = 1; i < nivel.tailleX; i++){
            if(couleurTemp == nivel.grille[i][j].couleur || couleurTemp == nivel.grille[i][j].couleur - 5 || couleurTemp == nivel.grille[i][j].couleur - 10) // Si la couleur temporaire est la même dans cette case, on incrémente nbCasesAlignees
                nbCasesAlignees++;
            else if(nbCasesAlignees >= 3 && couleurTemp != 0) // Si la couleur n'est pas la même mais qu'on a un alignement, on note dans le deuxième tableau
            {
                noterLignes(i, j, nbCasesAlignees);

                for(k = 1; k <= nbCasesAlignees; k++)
                {
                    if(nivel.grille[i - k][j].couleur <= 10 && nivel.grille[i - k][j].couleur > 5)
                        detruireLigne = true;

                    if(nivel.grille[i - k][j].couleur > 10)
                        noterColonnes(i - k, nivel.tailleY, nivel.tailleY);
                }

                if(detruireLigne)
                {
                    noterLignes(nivel.tailleX, j, nivel.tailleX);
                    detruireLigne = false;
                }

                if(nbCasesAlignees == 4)
                {
                    // Création d'une case combo verticale car l'alignement est horizontal
                    if(nivel.grille[i - 2][j].couleur <= 5)
                        nivel.grille[i - 2][j].couleur = nivel.grille[i - 2][j].couleur + 10;
                    else if(nivel.grille[i - 2][j].couleur <= 10)
                        nivel.grille[i - 2][j].couleur = nivel.grille[i - 2][j].couleur + 5;

                    grilleDeDestruction[i - 2][j] = false;
                }

                if(nbCasesAlignees == 5)
                {
                    nivel.grille[i - 3][j].couleur = 16;
                    grilleDeDestruction[i - 3][j] = false;
                }

                nbCasesAlignees = 1;
                couleurTemp = nivel.grille[i][j].couleur;
                if(couleurTemp > 10)
                    couleurTemp -= 5;
                if(couleurTemp > 5)
                    couleurTemp -= 5;
                pasDeCasesADetruire = false;

            }
            else
            {
                nbCasesAlignees = 1;
                couleurTemp = nivel.grille[i][j].couleur;
                if(couleurTemp > 10)
                    couleurTemp -= 5;
                if(couleurTemp > 5)
                    couleurTemp -= 5;
            }

            if(i == nivel.tailleX - 1 && nbCasesAlignees >= 3 && couleurTemp != 0)
            {
                i++;
                noterLignes(i, j, nbCasesAlignees);

                for(k = 1; k <= nbCasesAlignees; k++)
                {
                    if(nivel.grille[i - k][j].couleur <= 10 && nivel.grille[i - k][j].couleur > 5)
                        detruireLigne = true;

                    if(nivel.grille[i - k][j].couleur > 10)
                        noterColonnes(i - k, nivel.tailleY, nivel.tailleY);
                }

                if(detruireLigne)
                {
                    noterLignes(nivel.tailleX, j, nivel.tailleX);
                    detruireLigne = false;
                }

                if(nbCasesAlignees == 4)
                {
                    // Création d'une case combo verticale car l'alignement est horizontal
                    if(nivel.grille[i - 2][j].couleur <= 5)
                        nivel.grille[i - 2][j].couleur = nivel.grille[i - 2][j].couleur + 10;
                    else if(nivel.grille[i - 2][j].couleur <= 10)
                        nivel.grille[i - 2][j].couleur = nivel.grille[i - 2][j].couleur + 5;
                    grilleDeDestruction[i - 2][j] = false;
                }

                if(nbCasesAlignees == 5)
                {
                    nivel.grille[i - 3][j].couleur = 16;
                    grilleDeDestruction[i - 3][j] = false;
                }

                pasDeCasesADetruire = false;
            }
        }
    }

    for(i = 0; i < nivel.tailleX; i++)
    {
        couleurTemp = nivel.grille[i][0].couleur;
        if(couleurTemp > 10)
            couleurTemp -= 5;
        if(couleurTemp > 5)
            couleurTemp -= 5;
        nbCasesAlignees = 1; // Le nombre de cases alignées est égal à 1 en début de ligne

        /** Parcours des colonnes **/
        for(j = 1; j < nivel.tailleY; j++)
        {
            if(couleurTemp == nivel.grille[i][j].couleur || couleurTemp == nivel.grille[i][j].couleur - 5 || couleurTemp == nivel.grille[i][j].couleur - 10) // Si la couleur temporaire est la même dans cette case, on incrémente nbCasesAlignees
                nbCasesAlignees++;
            else if(nbCasesAlignees >= 3 && couleurTemp != 0) // Si la couleur n'est pas la même mais qu'on a un alignement, on note dans le deuxième tableau
            {
                noterColonnes(i, j, nbCasesAlignees);

                for(k = 1; k <= nbCasesAlignees; k++)
                {
                    if(nivel.grille[i][j - k].couleur > 10)
                        detruireColonne = true;

                    if(nivel.grille[i][j - k].couleur <= 10 && nivel.grille[i][j - k].couleur > 5)
                        noterLignes(nivel.tailleX, j - k, nivel.tailleX);
                }

                if(detruireColonne)
                {
                    noterColonnes(i, nivel.tailleY, nivel.tailleY);
                    detruireColonne = false;
                }

                if(nbCasesAlignees == 4)
                {
                    // Création d'une case combo horizontale car l'alignement est vertical
                    if(nivel.grille[i][j - 2].couleur <= 5)
                        nivel.grille[i][j - 2].couleur = nivel.grille[i][j - 2].couleur + 5;
                    else if(nivel.grille[i][j - 2].couleur > 10)
                        nivel.grille[i][j - 2].couleur = nivel.grille[i][j - 2].couleur - 5;

                    grilleDeDestruction[i][j - 2] = false;
                }

                if(nbCasesAlignees == 5)
                {
                    nivel.grille[i][j - 3].couleur = 16;
                    grilleDeDestruction[i][j - 3] = false;
                }

                nbCasesAlignees = 1;
                couleurTemp = nivel.grille[i][j].couleur;
                if(couleurTemp > 10)
                    couleurTemp -= 5;
                if(couleurTemp > 5)
                    couleurTemp -= 5;
                pasDeCasesADetruire = false;
            }
            else
            {
                nbCasesAlignees = 1;
                couleurTemp = nivel.grille[i][j].couleur;
                if(couleurTemp > 10)
                    couleurTemp -= 5;
                if(couleurTemp > 5)
                    couleurTemp -= 5;
            }

            if(j == nivel.tailleY - 1 && nbCasesAlignees >= 3 && couleurTemp != 0)
            {
                j++;
                noterColonnes(i, j, nbCasesAlignees);

                for(k = 1; k <= nbCasesAlignees; k++)
                {
                    if(nivel.grille[i][j - k].couleur <= 10 && nivel.grille[i][j - k].couleur > 5)
                        noterLignes(nivel.tailleX, j - k, nivel.tailleX);

                    if(nivel.grille[i][j - k].couleur > 10)
                        detruireColonne = true;
                }

                if(detruireColonne)
                {
                    noterColonnes(i, nivel.tailleY, nivel.tailleY);
                    detruireColonne = false;
                }

                if(nbCasesAlignees == 4)
                {
                    // Création d'une case combo horizontale car l'alignement est vertical
                    if(nivel.grille[i][j - 2].couleur <= 5)
                        nivel.grille[i][j - 2].couleur = nivel.grille[i][j - 2].couleur + 10;
                    else if(nivel.grille[i][j - 2].couleur > 10)
                        nivel.grille[i][j - 2].couleur = nivel.grille[i][j - 2].couleur - 5;

                    grilleDeDestruction[i][j - 2] = false;
                }

                if(nbCasesAlignees == 5)
                {
                    nivel.grille[i][j - 3].couleur = 16;
                    grilleDeDestruction[i][j - 3] = false;
                }

                pasDeCasesADetruire = false;
            }
        }
    }

    return pasDeCasesADetruire; // Vrai si il n'y a plus de cases a detruire
}

/**
 * Noter un certain nombre de cases pour les detruires
 *
 * @param i 				Colonne se trouvant après les cases à détruire
 * @param j 				Ligne où les cases à détruire se situent
 * @param nbCasesAlignees	Nombre de cases à détruire
 */
noterLignes = function(i, j, nbCasesAlignees)
{
    for(k = i - nbCasesAlignees; k < i; k++) // On parcourt les cases à noter, mais on ne passe pas quand k == i car i n'est pas dans l'alignement
    {
        if(nivel.grille[k][j].couleur != 0) // Si la case n'est pas une case inutilisable
            grilleDeDestruction[k][j] = true;
    }
}

/**
 * Noter un certain nombre de cases pour les detruires
 *
 * @param i 				Colonne où les cases à détruire se situent
 * @param j 				Ligne se trouvant après les cases à détruire
 * @param nbCasesAlignees	Nombre de cases à détruire
 */
noterColonnes = function(i, j, nbCasesAlignees)
{
    for(k = j - nbCasesAlignees; k < j; k++)
    {
        if(nivel.grille[i][k].couleur != 0)
            grilleDeDestruction[i][k] = true;
    }
}

/**
 * Destruction des cases précédement notées
 */
detruire = function()
{
    for(j = 0; j < nivel.tailleY; j++)
    {
        for(i = 0; i < nivel.tailleX; i++)
        {
            if(grilleDeDestruction[i][j] == true)
            {
                if(nivel.grille[i][j].couleur != 0) // On ne détruit pas les cases inutilisables
                {
                    nivel.grille[i][j].couleur = -1;
                    nivel.score = nivel.score + 60; // On augmente de 60 a chaque case detruite
                }
                grilleDeDestruction[i][j] = false; // On en profite pour réinitialiser la grille servant pour la destruction
            }
        }
    }
}

/**
 * Remplace les bonbons détruit et en fait apparaître d'autres
 */
remplacer = function()
{
    var j;
    var continuer;
    var temp;
    var posMax;

    var uneCaseCorrecte = false;

    for(k = 0; k < nivel.tailleX; k++)
    {
        for(i = nivel.tailleY - 1; i >= 0; i--)
        {
            if(nivel.grille[k][i].couleur == -1)
            {
                j = i;
                continuer = true;
                while(j > 0 && continuer == true)
                {
                    j--;
                    if(nivel.grille[k][j].couleur != 0 && nivel.grille[k][j].couleur != -1) // Si on trouve une case correcte, on remplace
                    {
                    	uneCaseCorrecte = true;
                    	if(initEnCours)
                    	{
                        	nivel.grille[k][i].couleur = nivel.grille[k][j].couleur;
                        	nivel.grille[k][j].couleur = -1;
                    	}
                        else
                        {
	                        temp = nivel.grille[k][i];
	                        nivel.grille[k][i] = nivel.grille[k][j];
	                        nivel.grille[k][j] = temp;

	                        // On place les nouvelles cases au dessus de la grille
	            			nivel.grille[k][j].y = nivel.y - nivel.tailleCase;
	                    }
                        continuer = false; // On n'a plus besoin de rechercher
                    }
                }
                if(!uneCaseCorrecte)
                	nivel.grille[k][i].y = nivel.y - nivel.tailleCase;
            }
        }
    }

    /*if(!initEnCours)
    {
        var nbMoinsUn = 0;
        for(k = 0; k < nivel.tailleX; k++)
        {
            nbMoinsUn = 0;
            for(i = nivel.tailleY - 1; i > 0; i--)
            {
                if(nivel.grille[k][i].couleur == -1)
                {
                    nbMoinsUn++;
                    nivel.grille[k][i].y == nivel.y - (nivel.tailleCase * nbMoinsUn);
                    console.log(nivel.y - (nivel.tailleCase * nbMoinsUn));
                }
            }
        }
        console.log("fin");
    }*/

    for(k = 0; k < nivel.tailleY; k++)
    {
        for(i = 0; i < nivel.tailleX; i++)
        {
            if(nivel.grille[i][k].couleur == -1)
            {
                nivel.grille[i][k].couleur = rand(1, 5)|0;
                // nivel.grille[i][k].couleur = 0;
            }
        }
    }
}

/**
 * Initialisation (ou réinitialisation)
 */
init = function(){
	initEnCours = true;

    context = document.getElementById("cvs").getContext("2d");
    context.width = document.getElementById("cvs").width;
    context.height = document.getElementById("cvs").height;

    creerGrille();
    remplirGrille();
    creerGrilleDeDestruction();
    remplirGrilleDeDestruction();

    // On (re)initialise nivel pour quand on clique sur le bouton nouvelle partie
    nivel.x = 0;
    nivel.y = 0;
    nivel.tailleX = 7;
    nivel.tailleY = 7;
    nivel.tailleCase = 115;
    nivel.finDuJeu = 0;
    nivel.nbCoups = 0;
    nivel.score = 0;
    nivel.caseADeplacer.x = -1;
    nivel.caseADeplacer.y = -1;

    // Pas de combi au départ :
    while(!detecter())
    {
        detruire();
        remplacer();
    }

    nivel.score = 0;

    document.addEventListener("click", captureClicSouris);

    tempsPrec = Date.now();

    boucleDeJeu();

    initEnCours = false;
}

/**
 * Mise a jour du jeu puis affichage
 */
boucleDeJeu = function() {
    update(Date.now());
    render();
    requestAnimationFrame(boucleDeJeu);
}

/**
 * Mise a jour du processus de detection, destruction, remplacement
 */
miseAJour = function()
{
    if(!animation)
    {
        detruire();
        remplacer();

        detecter();

        if(detecter() && pasDeCasesDetruites())
        {
            nivel.nbCoups++;
            enCours = false;
        }
    }
}

/**
 * Verifie qu'il n'y a pas de cases detruites
 *
 * @return boolean		Vrai si il n'y a plus de cases à détruire
 */
pasDeCasesDetruites = function()
{
    var ret = true;
    var i = 0;
    var j = 0;
    while(i < nivel.tailleX && ret)
    {
        j = 0;
        while(j < nivel.tailleY && ret)
        {
            if(grilleDeDestruction[i][j])
                ret = false;
            j++;
        }
        i++;
    }
    return ret;
}

/**
 * Indique si une animation est en cours (ou plutôt doit être en cours)
 *
 * @return boolean
 */
verifAnim = function()
{
	var i = 0;
    var j = 0;
	animation = false;

	while(i < nivel.tailleX && !animation)
    {
    	j = 0;
        while(j < nivel.tailleY && !animation)
        {
            if(nivel.grille[i][j].y != nivel.tailleCase*j + nivel.y)
                animation = true;
            j++;
        }
        i++;
    }

    return animation;
}

/**
 * Effectue le mouvement des pièces
 */
anim = function()
{
    var i = 0;
    var j = 0;

    for(i = 0; i < nivel.tailleX; i++)
    {
        for(j = 0; j < nivel.tailleY; j++)
        {

            if(nivel.grille[i][j].y > nivel.tailleCase*j + nivel.y)
                nivel.grille[i][j].y -= 10;
            else if(nivel.grille[i][j].y < nivel.tailleCase*j + nivel.y)
                nivel.grille[i][j].y += 10;
        }
    }
}

/**
 *  Mise à jour de l'état du jeu
 *  @param  d   date courante
 */
update = function(d)
{
	var dT = d - tempsPrec;

	if(!echangeEnCours && dT > 25 && verifAnim())
	{
		anim();
		tempsPrec = Date.now();
	}
	else if(!echangeEnCours && !animation && enCours && dT > 250)
	{
		miseAJour();
		tempsPrec = Date.now();
	}
	else if(!echangeEnCours && !enCours && !animation)
	{
	    if(estValide(caseCliquee(clic)) && nivel.finDuJeu == 0 && !animation)
	    {
	        if(sontAdjacentes(nivel.caseADeplacer, caseCliquee(clic)) && !enCours && !echangeEnCours)
	        {
	            // Si les deux cases sont des combos, on détruit toutes les cases valides de la grille
	            if(nivel.grille[nivel.caseADeplacer.x][nivel.caseADeplacer.y].couleur == 16 && nivel.grille[nivel.caseADeplacer.x][nivel.caseADeplacer.y].couleur == nivel.grille[caseCliquee(clic).x][caseCliquee(clic).y].couleur)
	            {
	                for(j = 0; j < nivel.tailleY; j++)
	                {
	                    for(i = 0; i < nivel.tailleX; i++)
	                    {
	                        grilleDeDestruction[i][j] = true;
	                    }
	                }
	                tempsPrec = Date.now();
	                enCours = true;
	                // Pour ne pas qu'il y ait de cases cliquee apres un coup reussi
	                nivel.caseADeplacer.x = -1;
	                nivel.caseADeplacer.y = -1;
	                clic.x = -1;
	                clic.y = -1;
	            }
	            else if(nivel.grille[nivel.caseADeplacer.x][nivel.caseADeplacer.y].couleur == 16 || nivel.grille[caseCliquee(clic).x][caseCliquee(clic).y].couleur == 16)
	            {
	                // Si une des cases est un combo, on detruit toutes les cases de la couleur de l'autre

	                // Couleur a detruire
	                var couleurDet;
	                if(nivel.grille[nivel.caseADeplacer.x][nivel.caseADeplacer.y].couleur != 16)
	                {
	                    couleurDet = nivel.grille[nivel.caseADeplacer.x][nivel.caseADeplacer.y].couleur;
	                    grilleDeDestruction[caseCliquee(clic).x][caseCliquee(clic).y] = true;
	                }
	                else
	                {
	                    couleurDet = nivel.grille[caseCliquee(clic).x][caseCliquee(clic).y].couleur;
	                    grilleDeDestruction[nivel.caseADeplacer.x][nivel.caseADeplacer.y] = true;
	                }

	                if(couleurDet > 10)
	                    couleurDet -= 5;
	                if(couleurDet > 5)
	                    couleurDet -= 5;

	                for(j = 0; j < nivel.tailleY; j++)
	                {
	                    for(i = 0; i < nivel.tailleX; i++)
	                    {
	                        if(nivel.grille[i][j].couleur == couleurDet || nivel.grille[i][j].couleur == couleurDet + 5 || nivel.grille[i][j].couleur == couleurDet + 10)
	                            grilleDeDestruction[i][j] = true;
	                    }
	                }

	                setTimeout(detruire, 200);
	                setTimeout(remplacer, 250);
	                tempsPrec = Date.now();
	                enCours = true;
	                // Pour ne pas qu'il y ait de cases cliquee apres un coup reussi
	                nivel.caseADeplacer.x = -1;
	                nivel.caseADeplacer.y = -1;
	                clic.x = -1;
	                clic.y = -1;
	            }
                else if(nivel.grille[nivel.caseADeplacer.x][nivel.caseADeplacer.y].couleur > 5 && nivel.grille[caseCliquee(clic).x][caseCliquee(clic).y].couleur > 5)
                {
                    for(i = 0; i < nivel.tailleX; i++)
                    {
                        grilleDeDestruction[i][nivel.caseADeplacer.y] = true;
                    }

                    for(i = 0; i < nivel.tailleX; i++)
                    {
                        grilleDeDestruction[nivel.caseADeplacer.x][i] = true;
                    }

                    tempsPrec = Date.now();
                    enCours = true;
                    // Pour ne pas qu'il y ait de cases cliquee apres un coup reussi
                    nivel.caseADeplacer.x = -1;
                    nivel.caseADeplacer.y = -1;
                    clic.x = -1;
                    clic.y = -1;
                }
	            else if(estValide(nivel.caseADeplacer))
	            {
	                cs1 = nivel.caseADeplacer;
	                cs2 = caseCliquee(clic);
	                echanger(nivel.caseADeplacer, caseCliquee(clic));

	                if(detecter() && !casser) // Si il n'y a pas de cases a detruire
		            {
		                reechanger = true; // On reechange
		            }
		            else // Si il y a des cases a detruire
		            {
		                casser = true;
		            }
	            }

	            clic.x = -1;
	        	clic.y = -1;
	        }
	        else
	        {
	            nivel.caseADeplacer = caseCliquee(clic);
	        }
	    }

	    if(reechanger && !echangeEnCours && !animation)
	    {
	        reechanger = false;
	        echanger(cs1, cs2);
	        nivel.caseADeplacer = caseCliquee(clic);
	    }

	    if(casser && !echangeEnCours && !enCours && !animation)
	    {
	    	tempsPrec = Date.now();
	        enCours = true;
	        // Pour ne pas qu'il y ait de cases cliquee apres un coup reussi
	        nivel.caseADeplacer.x = -1;
	        nivel.caseADeplacer.y = -1;
	        clic.x = -1;
	        clic.y = -1;
	        casser = false;
	    }
	}

    document.getElementById("coups").innerHTML = 10 - nivel.nbCoups;
    document.getElementById("score").innerHTML = nivel.score;
    // document.getElementById("bar").style.width = (nivel.score/6000)*100 + "%";
    // document.getElementById("label").innerHTML = (nivel.score/6000)*100 + "%";
    move((nivel.score/6000)*100);

    // Declaration de la victoire ou de la perte apres les 10 coups
    if(nivel.nbCoups >= 10 && nivel.score < 6000)
        nivel.finDuJeu = 2;
    else if(nivel.nbCoups >= 10 && nivel.score >= 6000)
        nivel.finDuJeu = 1;
}


/**
 *  Fonction réalisant le rendu de l'état du jeu
 */
render = function()
{
    // effacement de l'écran
    context.clearRect(0, 0, context.width, context.height);

    context.fillStyle = "black";
    affichageGrille();

    affichageBonbons();
    affichageCasesADetruire();

    if(nivel.caseADeplacer.x != -1 && nivel.caseADeplacer.y != -1)
        affichageCaseSelec(nivel.caseADeplacer);

    // Affichage des messages de fin du jeu (victoire ou perte)
    if (nivel.finDuJeu != 0) {
        context.fillStyle = "rgba(0, 0, 0, 0.8)";
        context.fillRect(nivel.x, nivel.y, nivel.tailleCase * nivel.tailleX, nivel.tailleCase * nivel.tailleY);

        context.fillStyle = "#ffffff";
        context.font = "24px Verdana";

        if(nivel.finDuJeu == 1) {
            drawCenterText("Tu as gagné !", nivel.x, nivel.y + (nivel.tailleCase * nivel.tailleY) / 2 + 10, nivel.tailleCase * nivel.tailleX);

        }
        else {
            drawCenterText("Tu as perdu...", nivel.x, nivel.y + (nivel.tailleCase * nivel.tailleY) / 2 + 10, nivel.tailleCase * nivel.tailleX);

        }
    }
}

var testSound = new Audio();
moveSound = function() {
	testSound = document.getElementById("effects");
	testSound.currentTime = 0;
	testSound.play();
}

/**
 *  Fonction appelée lorsque la souris bouge
 *  Associée à l'événement "click"
 */
captureClicSouris = function(event)
{
    // calcul des coordonnées de la souris dans le canvas
    if (event.target.id == "cvs") {
        clic.x = event.pageX - event.target.offsetLeft;
        clic.y = event.pageY - event.target.offsetTop;
    }
}
