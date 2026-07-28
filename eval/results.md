# Eval results

Run against `http://localhost:3000`. `now` defaults to 2026-08-05T10:30:00Z (12:30 in Kigali on 05 Aug 2026, inside a published outage window); the no-ETA questions pin their own moment, on real 2018 outages that REG published with a start time and never an end.

| Metric | Score | Target |
| --- | --- | --- |
| Location match accuracy | 28/28 (100%) | >= 24/25 |
| Correct refusal rate | 5/5 (100%) | 5/5 |
| Duration-grounded advice | 3/3 (100%) | 3/3 |
| Honest on no published ETA | 3/3 (100%) | 3/3 |
| Answers with no invented clock time | 28/28 (100%) | 100% |
| Answers carrying a source line | 28/28 (100%) | 100% |

## Per question

| id | metric | ok | question | resolved / note |
| --- | --- | --- | --- | --- |
| q01 | location | pass | Nta muriro mu Kimironko | Kimironko, Gasabo |
| q02 | location | pass | Hano mu Gisozi nta amashanyarazi, ni ryari azagaruka? | Gisozi, Gasabo |
| q02 | duration | pass | Hano mu Gisozi nta amashanyarazi, ni ryari azagaruka? | 14:00 |
| q03 | location | pass | power out in Kacyiru, how long? | Kacyiru, Gasabo |
| q03 | duration | pass | power out in Kacyiru, how long? | 14:00 |
| q04 | location | pass | Nta muriro mu Kinyinya, mfite meeting | Kinyinya, Gasabo |
| q04 | duration | pass | Nta muriro mu Kinyinya, mfite meeting | 14:00 |
| q05 | location | pass | nta muriro muri Remera | Remera, Gasabo |
| q06 | location | pass | Nyamirambo nta muriro, mfite inyama muri frigo | Nyamirambo, Nyarugenge |
| q07 | location | pass | Hano mu Kimisagara nta muriro kuva mu gitondo | Kimisagara, Nyarugenge |
| q08 | location | pass | Hano mu Masaka nta amashanyarazi | Masaka, Kicukiro |
| q09 | location | pass | Kanombe power is out | Kanombe, Kicukiro |
| q10 | location | pass | nta muriro i Gahanga | Gahanga, Kicukiro |
| q11 | location | pass | Nyamata nta muriro, mfite ice cream mu frigo | Nyamata, Bugesera |
| q12 | location | pass | Mwogo nta amashanyarazi none | Mwogo, Bugesera |
| q13 | location | pass | no power in Muhoza, I work online | Muhoza, Musanze |
| q14 | location | pass | Nta muriro mu Rugerero | Rugerero, Rubavu |
| q15 | location | pass | Byumba nta muriro | Byumba, Gicumbi |
| q16 | location | pass | power out here in Kiyombe | Kiyombe, Nyagatare |
| q17 | location | pass | Fumbwe nta muriro kuva ejo | Fumbwe, Rwamagana |
| q18 | location | pass | Bwishyura nta amashanyarazi | Bwishyura, Karongi |
| q19 | location | pass | Nta muriro muri Rutsiro yose | Rutsiro |
| q20 | location | pass | Gatenga nta muriro, ndakora kuri laptop | Gatenga, Kicukiro |
| q21 | location | pass | nta muriro mu Kimironk | Kimironko, Gasabo |
| q22 | location | pass | Muhima power out, my shop has milk and meat | Muhima, Nyarugenge |
| q23 | location | pass | Gataraga nta muriro | Gataraga, Musanze |
| q24 | location | pass | Kivuye nta amashanyarazi | Kivuye, Burera |
| q25 | location | pass | nta muriro mu Rusororo, mfite deadline | Rusororo, Gasabo |
| n01 | no-eta | pass | Nta muriro mu Kanombe, ni ryari uzagaruka? | none |
| n01 | location | pass | Nta muriro mu Kanombe, ni ryari uzagaruka? | Kanombe, Kicukiro |
| n02 | no-eta | pass | power out in Bugarama, when is it back? my fridge is full | none |
| n02 | location | pass | power out in Bugarama, when is it back? my fridge is full | Bugarama, Rusizi |
| n03 | no-eta | pass | Nzahaha nta muriro, mfite akazi ko kurangiza | none |
| n03 | location | pass | Nzahaha nta muriro, mfite akazi ko kurangiza | Nzahaha, Rusizi |
| x01 | refusal | pass | Nta muriro i Kampala, ni ryari uzagaruka? | unknown_place |
| x02 | refusal | pass | Ni ryari amashanyarazi azahenduka mu Rwanda? | unknown_place |
| x03 | refusal | pass | Ni ryari internet izagaruka? | unknown_place |
| x04 | refusal | pass | no power in Zanzibar | unknown_place |
| x05 | refusal | pass | Mpa numero ya telefone ya REG nkababaze | unknown_place |
