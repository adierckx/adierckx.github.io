#include <TF1.h>
#include <TH1.h>
#include <TH2.h>
#include <TH3.h>
#include <TFile.h>
#include <TTree.h>
#include <TCanvas.h>
#include <TVector3.h>
#include <TLorentzVector.h>
#include <iostream>
#include <TRandom3.h>
#include <time.h>
#include <cmath>

// On definit des constantes valables
// dans tout le code.
#define pi 3.141592
#define Ebeam 10.
#define alphaEM 0.0072973525
#define alphaS 0.1184
#define Nc 3.
#define CF 4./3

using namespace std;

// Codez ici une formule permettant de faire le passage
// du referentiel alpha, beta, gamma au referentiel du
// laboratoire.
// Cette fonction doit prendre les 3 angles en argument
// plus une reference au quadrivecteur a modifier.
void myRotate(double alpha, double beta, double gamma, TLorentzVector &particle)
{
  // Pour acceder au trivecteur du quadrivecteur
  // on utilise la methode Vect()
  TVector3 myVect = particle.Vect();
  TVector3 X (1.,0.,0.);
  TVector3 Z (0.,0.,1.);
  // La methode Rotate(alpha, V) effectue
  // une rotation d un angle alpha autour de
  // l axe defini par le vecteur V
  myVect.Rotate(-gamma, Z); X.Rotate(-gamma, Z);
  
  myVect.Rotate(-beta, X); Z.Rotate(-beta, X);
  
  myVect.Rotate(-alpha, Z);
  
  particle.SetVect(myVect);
}
// Codez ici l expression de la section efficace
// differentielle en termes des variables x1, x2, beta, gamma
double dsigma(double x1, double x2, double beta, double gamma,double Qq)
{
  double x3 = 2. - x1 - x2;
  double cosTheta1 = -((x1*x1) + (x3*x3) - (x2*x2))/(2*x1*x3);
  double cosTheta2 = -((x2*x2) + (x3*x3) - (x1*x1))/(2*x2*x3);
  double theta1= acos( cosTheta1);
  double theta2= acos(cosTheta2);
  double factor = (CF*alphaEM*alphaEM*alphaS*Nc*(Qq)*(Qq))/(4*pi*pi); //Qq: charge du quark
  double bracket = (x1*x1*(1+sin(beta)*sin(beta)*sin(gamma+theta1)*sin(gamma+theta1))) + x2*x2*(1+sin(beta)*sin(beta)*sin(gamma-theta2)*sin(gamma-theta2));
  double deno = (2*Ebeam)*(2*Ebeam)*(1-x1)*(1-x2);
  double result = factor*bracket/deno;
  return result;
}
// Codez ici la fonction principale qui genere les
// evenements et qui applique la methode de rejection.
void rejMethode()
{
  // Determinez le sigmaMax en faisant une premiere
  // boucle et en sauvant la valeur maximale de la
  // section efficace
  double sigmaMax = 2.83894e-09;
  // Declarez toutes les variables necessaires pour
  // votre programme
  int npoints = 5000000, nAccepted = 0;
  double alpha, cosBeta, beta, gamma, x1, x2, x3,y1,y2,y_min, y_max , cosTheta1, cosTheta2, theta1, theta2, fmax,cosThetaEK;
  //Variables pour Jade
  double Mqqb, Mqg, Mqbg,Mqqbg, s, ycut1,ycut2,ycut3,ycut4, Njet1,Njet2,Njet3,Njet4;
  double x_m = 0.00005; //Xmin et 1-Xmin, évite les divergences
  // Declarez les 5 quadri vecteurs ainsi que les
  // variables a sauver
  TLorentzVector ele, pos, quark, antiq, gluon; 
  ele.SetPxPyPzE((2*Ebeam/2), 0., 0., (2*Ebeam/2));
  pos.SetPxPyPzE(-(2*Ebeam/2), 0., 0., (2*Ebeam/2)); 
  double x1_Rec, x2_Rec, x3_Rec; 
  // Declarez une serie d histogrammes vous permettant
  // de controler vos resultats
  TH1F *h_cosThetaQuark = new TH1F("h_cosThetaQuark","h_cosThetaQuark",100, -1., 1.);
  TH1F *h_cosThetaAntiq = new TH1F("h_cosThetaAntiq","h_cosThetaAntiq",100, -1., 1.);
  TH1F *h_alpha = new TH1F("h_alpha","h_alpha",100, 0., 6.29);
  TH1F *h_gamma = new TH1F("h_gamma","h_gamma",100, 0., 6.29);
  TH1F *h_cosBeta = new TH1F("h_cosBeta","h_cosBeta",100, -1., 1.);
  TH1F *h_beta = new TH1F("h_beta","h_beta",100, 0., 3.142);
  TH3F *h_xxx = new TH3F("h_xxx", "h_xxx;x_{1};x_{2};x_{3}", 100, 0.5, 1, 100, 0.4, 1, 100, 0, 0.7);
  TH1F *h_x1 = new TH1F("h_x1","h_x1",100,0.65,1);
  TH1F *h_x2 = new TH1F("h_x2","h_x2",100,0.45,1);
  TH1F *h_x3 = new TH1F("h_x3","h_x3",100,0,1);
  TH2F *h_x1x2 = new TH2F("h_x1x2","h_x1x2;x_{1};x_{2}",100,0.6,1,100,0.4,1);
  TH1F *h_cosThetaEK = new TH1F("h_cosThetaEK","h_cosThetaEK;cos#theta_{EK}",100,0,1);
  TH2F *h_sigmax1 = new TH2F("h_sigmax1","h_sigmax1",1000, 0, 3e-09, 100, 0.6, 1);
  //Algo JADE
  TH1F *h_jet_ycut1 = new TH1F("h_jet_ycut1","h_jet_ycut1",3,0.5,3.5);
  TH1F *h_jet_ycut2 = new TH1F("h_jet_ycut2","h_jet_ycut2",3,0.5,3.5);
  TH1F *h_jet_ycut3 = new TH1F("h_jet_ycut3","h_jet_ycut3",3,0.5,3.5);
  TH1F *h_jet_ycut4 = new TH1F("h_jet_ycut4","h_jet_ycut4",3,0.5,3.5);
  // Initialisez le generateur de nombres aleatoires
  TRandom3 generateur;
  generateur.SetSeed(123456);
  // Ici commence la boucle sur les evenements a generer
  for (int i=0; i<npoints; i++)
  {
    // Générer les variables pour construire les 4-vecteurs de le CM
    alpha = generateur.Rndm() * 2*pi; 	//alpha entre 0 et 2pi
    cosBeta = (generateur.Rndm() * 2) -1; //beta entre 0 et pi
    gamma = generateur.Rndm() *2*pi;	//gamma entre 0 et 2pi
    //Changement de variable
    y_min = -log(1.-x_m); y_max = -log(x_m);
    y1 = generateur.Rndm()* (y_max - y_min) + y_min;
    y2 = generateur.Rndm()* (y_max - y_min) + y_min;
    x1 = 1. - exp(-y1);
    x2=  1. - exp(-y2);
    //x1 = generateur.Rndm() * (1 - 2* x_m) + x_m; // évite les divergences
    //x2 = generateur.Rndm() * (1 - 2* x_m) + x_m; //évite les divergences
    beta = acos(cosBeta);
    fmax = sigmaMax * generateur.Rndm();
    // Construisez toute la cinematique dans le referentiel alpha, beta, gamma
    x3 = 2 - x1 - x2;
    
    if (x3>=1-x_m) continue; 
    
    cosTheta1 = -((x1*x1) + (x3*x3) - (x2*x2))/(2*x1*x3);
    cosTheta2 = -((x2*x2) + (x3*x3) - (x1*x1))/(2*x2*x3);
    theta1= acos( cosTheta1);
    theta2= acos(cosTheta2);
    //Vecteurs des particules sortantes
    quark.SetPxPyPzE(Ebeam*x1*cos(theta1), Ebeam*x1*sin(theta1),0.,Ebeam*x1);
    antiq.SetPxPyPzE(Ebeam*x2*cos(theta2), Ebeam*x2*cos(pi)*sin(theta2),0.,Ebeam*x2);
    gluon.SetPxPyPzE(Ebeam*x3, 0., 0., Ebeam*x3);
    
    // Passage au referentiel du labo
    myRotate(alpha, beta, gamma, quark);
    myRotate(alpha, beta, gamma, antiq);
    myRotate(alpha, beta, gamma, gluon);

    h_alpha->Fill(alpha); h_gamma->Fill(gamma);	h_beta->Fill(beta); h_cosBeta->Fill(cosBeta);	

    // Inserez la condition de la methode de rejection
    double Sigma = (1-x1)*(1-x2)*dsigma(x1,x2,beta,gamma, 2./3); //pour un quark Up
    if (Sigma > sigmaMax) {
      sigmaMax = Sigma;
      cout << " !!!!!! " << endl;
    }
    if ( Sigma < fmax ) continue;
    nAccepted++;		
    //Variable reconstruites
    x1_Rec = max( max(x1, x2), max(x1, x3)  );
    x3_Rec = min( min(x1, x2), min(x1, x3)  );
    x2_Rec = 2 - x1_Rec - x3_Rec; // De telle manière que x1_Rec > x2_Rec > x3_Rec.
    cosThetaEK = (x2_Rec - x3_Rec)/x1_Rec;
    // Remplissez vos Histogrammes
    h_cosThetaQuark->Fill(cos(quark.Theta())); h_cosThetaAntiq->Fill(cos(antiq.Theta())); 
    h_xxx->Fill(x1_Rec, x2_Rec, x3_Rec);
    h_x1->Fill(x1_Rec); 
    h_x2->Fill(x2_Rec); h_x3->Fill(x3_Rec); 
    h_x1x2->Fill(x1_Rec,x2_Rec); 
    h_cosThetaEK->Fill(cosThetaEK);
    h_sigmax1->Fill(Sigma,x1_Rec);
    ////Algorithme JADE
    //Masse invariantes des différentes combinaisons quark, antiq, gluon
    Mqqb = (quark + antiq).M2();
    Mqg = (quark + gluon).M2();
    Mqbg = (antiq + gluon).M2();
    Mqqbg = (quark + antiq + gluon).M2();
    //Energie et cut
    s = 4*Ebeam*Ebeam;
    Njet1 = 3.; Njet2 = 3.; Njet3 = 3.; Njet4 = 3.;
    ycut1 = 0.00001; ycut2 =0.001; ycut3 = 0.01; ycut4 = 0.5;
    if (Mqg < s * ycut1 or Mqqb < s * ycut1 or Mqbg < s * ycut1){
    	Njet1 = 2.;
    	if (Mqqbg < s * ycut1 ) Njet1 = 1.;
    	}
    if (Mqg < s * ycut2 or Mqqb < s * ycut2 or Mqbg < s * ycut2) Njet2 +=-1;
    	if (Mqqbg < s * ycut2 ) Njet2 +=-1;
    if (Mqg < s * ycut3 or Mqqb < s * ycut3 or Mqbg < s * ycut3) Njet3 +=-1;
    	if (Mqqbg < s * ycut3 ) Njet3 +=-1;
    if (Mqg < s * ycut4 or Mqqb < s * ycut4 or Mqbg < s * ycut4) Njet4 +=-1;
    	if (Mqqbg < s * ycut4 ) Njet4 +=-1;
    
    h_jet_ycut1->Fill(Njet1);
    h_jet_ycut2->Fill(Njet2);
    h_jet_ycut3->Fill(Njet3);
    h_jet_ycut4->Fill(Njet4);
    
    
  }//fin de la boucle de generation d evenements

  // Hors de la boucle, dessinez vos histogrammes dans
  // des canevas. Faites des fit sur certaines distributions,
  // sauvez les histogrammes.

  TF1 *f = new TF1("f","[0]*(1.+[1]*x*x)", -0.9, 0.9);
  f->SetParameters(100, 1);

  cout << "Sigma Max = " << sigmaMax << endl;
  cout << "Eff = " << nAccepted*1./npoints << endl;
// Sauvez le canevas en format pdf
TCanvas *can_temp11 = new TCanvas(); h_cosThetaQuark->Fit("f"); h_cosThetaQuark->DrawCopy(); can_temp11->SaveAs("/home/antoine/Interaction Forte/PDF/h_cosThetaQuark.pdf"); //can_temp11->Close();
TCanvas *can_temp12 = new TCanvas(); h_cosThetaAntiq->Fit("f"); h_cosThetaAntiq->DrawCopy(); can_temp12->SaveAs("/home/antoine/Interaction Forte/PDF/h_cosThetaAntiq.pdf");can_temp12->Close();
TCanvas *can_temp13 = new TCanvas(); h_alpha->DrawCopy(); can_temp13->SaveAs("/home/antoine/Interaction Forte/PDF/h_alpha.pdf");can_temp13->Close();
TCanvas *can_temp14 = new TCanvas(); h_beta->DrawCopy(); can_temp14->SaveAs("/home/antoine/Interaction Forte/PDF/h_beta.pdf");can_temp14->Close();
TCanvas *can_temp15 = new TCanvas(); h_gamma->DrawCopy(); can_temp15->SaveAs("/home/antoine/Interaction Forte/PDF/h_gamma.pdf");can_temp15->Close();
TCanvas *can_temp16 = new TCanvas(); h_cosBeta->DrawCopy(); can_temp16->SaveAs("/home/antoine/Interaction Forte/PDF/h_cosBeta.pdf");can_temp16->Close();

TCanvas *can_temp21 = new TCanvas(); h_xxx->SetFillColor(kRed+1); h_xxx->Draw(); can_temp21->SaveAs("/home/antoine/Interaction Forte/PDF/h_xxx.pdf");//can_temp21->Close();
TCanvas *can_temp22 = new TCanvas();h_x1->DrawCopy(); can_temp22->SaveAs("/home/antoine/Interaction Forte/PDF/h_x1.pdf"); //can_temp22->Close();
TCanvas *can_temp23 = new TCanvas();h_x2->DrawCopy(); can_temp23->SaveAs("/home/antoine/Interaction Forte/PDF/h_x2.pdf"); //can_temp23->Close();
TCanvas *can_temp24 = new TCanvas();h_sigmax1->SetLineColor(kRed+1); h_sigmax1->Draw(); can_temp24->SaveAs("/home/antoine/Interaction Forte/PDF/h_sigmax1.pdf");//can_temp24->Close();
TCanvas *can_temp25 = new TCanvas();h_x1x2->SetLineColor(kRed+1); h_x1x2->Draw();   can_temp25->SaveAs("/home/antoine/Interaction Forte/PDF/h_x1x2.pdf");can_temp25->Close();
TCanvas *can_temp26 = new TCanvas();h_cosThetaEK->DrawCopy(); can_temp26->SaveAs("/home/antoine/Interaction Forte/PDF/h_cosThetaEK.pdf"); // can_temp26->Close();

TCanvas *can_temp31 = new TCanvas();h_jet_ycut1->DrawCopy(); can_temp31->SaveAs("/home/antoine/Interaction Forte/PDF/h_jet_ycut1.pdf");//can_temp31->Close();
TCanvas *can_temp32 = new TCanvas();h_jet_ycut2->DrawCopy(); can_temp32->SaveAs("/home/antoine/Interaction Forte/PDF/h_jet_ycut2.pdf");//can_temp32->Close();
TCanvas *can_temp33 = new TCanvas();h_jet_ycut3->DrawCopy(); can_temp33->SaveAs("/home/antoine/Interaction Forte/PDF/h_jet_ycut3.pdf");//can_temp33->Close();
TCanvas *can_temp34 = new TCanvas();h_jet_ycut4->DrawCopy(); can_temp34->SaveAs("/home/antoine/Interaction Forte/PDF/h_jet_ycut4.pdf");//can_temp34->Close();


}
