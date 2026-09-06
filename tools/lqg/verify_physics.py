"""Independent numerical checks for the displayed low-spin and Toller identities.

Optional review dependencies: numpy, sympy, mpmath. These are not site/build deps.
Run: python3 tools/lqg/verify_physics.py
"""
import itertools
import numpy as np
import mpmath as mp
from sympy import Rational
from sympy.physics.wigner import clebsch_gordan

def local_generators(j):
    ms=np.arange(-j,j+1)
    plus=np.zeros((len(ms),len(ms)),complex)
    for col,m in enumerate(ms[:-1]): plus[col+1,col]=np.sqrt((j-m)*(j+m+1))
    return [(plus+plus.T)/2,(plus-plus.T)/(2j),np.diag(ms)]

def volume_check(j):
    spin=Rational(str(j));ms=[-spin+i for i in range(int(2*j+1))]
    basis=list(itertools.product(ms,repeat=4))
    inv=np.zeros((len(basis),int(2*j+1)),complex)
    for k in range(int(2*j+1)):
        for row,(a,b,c,d) in enumerate(basis):
            inv[row,k]=sum(complex((-1)**(k-u)*clebsch_gordan(spin,spin,k,a,b,u)*clebsch_gordan(spin,spin,k,c,d,-u))/np.sqrt(2*k+1) for u in range(-k,k+1))
    assert np.allclose(inv.conj().T@inv,np.eye(len(ms)))
    L=local_generators(j);identity=np.eye(len(ms))
    def embedded(axis,leg):
        out=np.array([[1]])
        for a in range(4): out=np.kron(out,L[axis] if a==leg else identity)
        return out
    dot12=sum(embedded(a,0)@embedded(a,1) for a in range(3))
    dot23=sum(embedded(a,1)@embedded(a,2) for a in range(3))
    q=inv.conj().T@(1j*(dot12@dot23-dot23@dot12))@inv
    if j==.5:
        expected=np.sqrt(3)/4*np.array([[0,-1j],[1j,0]])
        spectrum=[-np.sqrt(3)/4,np.sqrt(3)/4]
    else:
        expected=np.array([[0,-2j/np.sqrt(3),0],[2j/np.sqrt(3),0,-1j*np.sqrt(5/3)],[0,1j*np.sqrt(5/3),0]])
        spectrum=[-np.sqrt(3),0,np.sqrt(3)]
        assert np.allclose(q@np.array([np.sqrt(5),0,2])/3,0)
    assert np.allclose(q,expected,atol=1e-13),(j,q,expected)
    assert np.allclose(np.linalg.eigvalsh(q),spectrum,atol=1e-13)

mp.mp.dps=45
def hyper_series(a,b,c,z):
    total=term=mp.mpc(1)
    for n in range(100000):
        term *= (a+n)*(b+n)*z/((c+n)*(n+1))
        total += term
        if abs(term) < mp.mpf('1e-43')*max(1,abs(total)): return total
    raise AssertionError('Hypergeometric series did not converge')
def reduced(j,m,rho,r):
    return mp.exp(-(j-1j*rho+m+1)*r)*hyper_series(j+m+1,j+1-1j*rho,2*j+2,1-mp.exp(-2*r))
def toller(s,j,m,rho,r,polynomial=False):
    z=mp.exp(-2*r)
    pref=mp.exp(-(j-s*1j*rho+s*m+1)*r)*mp.gamma(2*j+2)*mp.gamma(s*1j*rho-s*m)/(mp.gamma(j-s*m+1)*mp.gamma(j+1+s*1j*rho))
    if polynomial:
        poly=sum(mp.rf(-j-s*1j*rho,n)*mp.rf(-j+s*m,n)/(mp.rf(1+s*m-s*1j*rho,n)*mp.factorial(n))*z**n for n in range(int(j-s*m)+1))
        return pref*poly/(1-z)**(2*j+1)
    return pref*hyper_series(j+s*m+1,j+1-s*1j*rho,1+s*m-s*1j*rho,z)

if __name__=='__main__':
    for j in [.5,1]: volume_check(j)
    count=0
    for j in [0,mp.mpf('.5'),1,mp.mpf('1.5')]:
        for a in range(int(2*j)+1):
            m=-j+a
            for rho in [mp.mpf('.3'),mp.mpf('1.2')]:
                for r in [mp.mpf('.03'),mp.mpf('.7'),mp.mpf('2.1')]:
                    plus=toller(1,j,m,rho,r);minus=toller(-1,j,m,rho,r)
                    assert abs(plus+minus-reduced(j,m,rho,r))<mp.mpf('1e-32')
                    for s in [1,-1]: assert abs(toller(s,j,m,rho,r)-toller(s,j,m,rho,r,True))<mp.mpf('1e-30')
                    count+=1
    print(f'CG volume matrices and spectra verified; {count} minimal Toller sum/polynomial cases verified.')
