// Exact CPU grid kernels. JavaScript numbers use double arithmetic; retain it here.
// Float32 storage writes and the iteration order match the original engine.
typedef unsigned char u8;
__attribute__((export_name("gasScan")))
int gasScan(const float *s,const float *v,const float *m,const float *f,const float *k,const float *h,const u8 *type,const float *temp,u8 *active,int W,int H,int GX,double ambient){
  int any=0;
  for(int y=0,i=0;y<H;y++)for(int x=0;x<W;x++,i++){
    double sum=(double)s[i]+v[i]+m[i]+f[i]+k[i]+h[i];
    double dt=(double)temp[i]-ambient;if(dt<0)dt=-dt;
    if(sum>1e-4||(type[i]==0&&dt>0.5)){active[(y>>1)*GX+(x>>1)]=1;any=1;}
  }
  return any;
}
__attribute__((export_name("thermalScan")))
void thermalScan(const float *temp,u8 *rows,int W,int H,double ambient){
  for(int y=0;y<H;y++)for(int i=y*W,end=i+W;i<end;i++)if((double)temp[i]!=ambient){rows[y]=1;break;}
}
__attribute__((export_name("scanColumns")))
void scanColumns(const u8 *type,const float *gM,const float *gV,const float *gS,const float *gK,const float *gH,const float *gF,const float *temp,const float *fW,
                 u8 *sup,u8 *sD,int *colS,int *colD,float *dA,float *dB,float *occ,u8 *rowLiq,int *span0,int *span1,int *draw0,int *draw1,int W,int H,int y0,int y1,double thr){
  for(int y=0;y<H;y++){span0[y]=W;span1[y]=-1;}
  for(int x=0;x<W;x++){colD[x]=0;colS[x]=0;}
  for(int y=0,i=0;y<H;y++){
    int liqRow=y>=y0&&y<=y1,any=0;
    for(int x=0;x<W;x++,i++){
      int t=type[i];sup[i]=t?1:0;
      double hot=(double)temp[i]-800;if(hot<0)hot=0;
      if(t||(double)fW[i]>thr-0.14||(double)gM[i]>0.002||(double)gV[i]>0.002||(double)gS[i]>0.002||(double)gK[i]>0.01||(double)gH[i]>0.01||(double)gF[i]*1.3+hot/5000>0.01){
        if(x<span0[y])span0[y]=x;span1[y]=x;
      }
      if(!t){
        colS[x]=0;sD[i]=0;
        if(liqRow&&(double)fW[i]>=thr){dA[i]=(float)colD[x]++;occ[i]=(float)0.45;any=1;}
        else{dA[i]=-1;colD[x]=0;occ[i]=0;}
      }else{
        dA[i]=-1;colD[x]=0;occ[i]=1;
        // In the source sup[i] was set to 1 for every nonzero t above;
        // consequently its powder && !sup[i] branch can never be taken.
        int depth=colS[x];sD[i]=depth<254?depth:254;colS[x]=depth+1;
      }
    }
    rowLiq[y]=any?1:0;
  }
  for(int y=0;y<H;y++){
    if(!rowLiq[y])continue;
    int r=y*W,count=0;double sum=0;
    for(int o=0;o<=4;o++){double v=dA[r+o];if(v>=0){sum+=v;count++;}}
    for(int x=0;x<W;x++){
      int i=r+x;dB[i]=dA[i]<0?-1:(float)(sum/count);
      int xa=x+5,xr=x-4;
      if(xa<W){double v=dA[r+xa];if(v>=0){sum+=v;count++;}}
      if(xr>=0){double v=dA[r+xr];if(v>=0){sum-=v;count--;}}
    }
  }
  for(int y=0;y<H;y++){draw0[y]=W;draw1[y]=-1;}
  for(int y=0;y<H;y++){
    if(span1[y]<0)continue;
    int a=span0[y]-2;if(a<0)a=0;
    int b=span1[y]+4;if(b>W-1)b=W-1;
    int lo=y-2;if(lo<0)lo=0;int hi=y+5;if(hi>H-1)hi=H-1;
    for(int yy=lo;yy<=hi;yy++){if(a<draw0[yy])draw0[yy]=a;if(b>draw1[yy])draw1[yy]=b;}
  }
}
