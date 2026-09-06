"""Apply reviewed overview wording and Rovelli–Vidotto conventions after catalogue generation."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "assets/lqg/catalogue.json"


def main():
    data = json.loads(CATALOGUE.read_text())
    by_id = {eq["id"]: eq for eq in data["equations"]}

    by_id["T1"]["title"] = "Hilbert space of the theory"
    by_id["T1"]["note"] = (
        "Γ is the graph used to describe the quantum state, with L oriented links and N nodes. "
        "A state is a square-integrable function of L SU(2) holonomies. The quotient by SU(2)^N "
        "imposes an independent SU(2) gauge transformation at every node, so H_Γ is the gauge-invariant "
        "Hilbert space associated with Γ."
    )

    by_id["T2"]["title"] = "Algebra of observables"
    by_id["T2"]["latex"] = (
        r"\boxed{[\hat L_l^i,\hat L_{l'}^j]="
        r"i\delta_{ll'}\epsilon^{ij}{}_{k}\hat L_l^k,\qquad "
        r"\hat{\mathbf E}_l=8\pi\gamma\ell_P^2\hat{\mathbf L}_l="
        r"8\pi\gamma\frac{G\hbar}{c^3}\hat{\mathbf L}_l.}"
    )
    by_id["T2"]["note"] = (
        "L_l^i are the dimensionless su(2) generators associated with link l; δ_ll′ states that generators "
        "on distinct links commute, and ε^{ij}{}_k are the su(2) structure constants. The physical flux "
        "E_l has dimensions of area and is obtained by multiplying L_l by 8πγℓ_P², with "
        "ℓ_P²=Gℏ/c³. The dimensionless parameter γ is the Barbero–Immirzi parameter."
    )

    by_id["T3"]["note"] = (
        "A_v is the elementary Lorentzian spin-foam vertex amplitude and ψ_v is its SU(2) boundary state. "
        "The EPRL map Y_γ sends each SU(2) spin-j sector into the γ-simple SL(2,C) representation "
        "(ρ,k)=(γj,j). P_SL(2,C) imposes Lorentz gauge invariance by group averaging at the boundary nodes "
        "of the vertex, with one redundant integration removed by gauge fixing. The final evaluation at 𝟙 "
        "sets the remaining Lorentz group arguments to the identity and yields the scalar vertex amplitude."
    )

    data["groups"]["T"]["title"] = "Basic equations"
    CATALOGUE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print("LQG overview conventions patched")


if __name__ == "__main__":
    main()
