# Skatteverket-API:er

Ansök inte förrän funktionen ska byggas. Varje rad är en egen ansökan. Fler kan läggas till här senare.

| Behov | API hos Skatteverket | Vad det ger |
| --- | --- | --- |
| Skattekonto och saldo | Skattekonto | Dagssaldo, transaktioner, utbetalningskonto och utbetalningsspärr. Saldo och konto är samma API. |
| Momsdeklarationens status | Momsdeklaration | Inlämnade och beslutade uppgifter för en period. Samma API kan senare spara ett deklarationsutkast. |
| Momsperiod | Kundhändelser och Momsdeklaration | Perioderna anges som sista månaden, till exempel 202501. Månad, kvartal eller år härleds från flera perioder: varje månad, bara 03/06/09/12, eller en period per år. Kräver behörigheten Momsdeklaration, ombud. Beskattningsengagemang behövs inte. |
| Arbetsgivardeklaration, inlämning | Arbetsgivardeklaration inlämning | Läsa in underlag. Finns redovisningsperioder ska deklarationen lämnas. Granskning och underskrift sker på Mina sidor. |

Hämta företagsnamn och bolagsform finns inte hos Skatteverket. Det görs mot Bolagsverket. Beskattningsengagemang används inte: momsperiod och arbetsgivardeklaration läses av från perioderna ovan.
