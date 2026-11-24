# Version 1 manual test cases

**Status:** 14 planned cases. All are Not Run. Reset to the synthetic seed before each case. HSD refers to the Harbor Soap Dish at $12.00 with starting stock of 5. Payment cases use the local simulator only.

| ID | Requirement | Procedure | Expected result |
| --- | --- | --- | --- |
| M01 | EC-R01 | Open the catalog with the seeded inventory. | Three products show the documented USD prices. Dune Bath Brush is marked out of stock. |
| M02 | EC-R01 | Open the HSD detail page from the catalog. | HSD shows the same $12.00 price and available status. |
| M03 | EC-R01 | Open Dune Bath Brush and inspect or attempt its add-to-cart action. | The item cannot be added and the cart stays unchanged. |
| M04 | EC-R02 | Add one HSD and open the cart. | One HSD is listed, with a $12.00 subtotal and a $17.00 checkout total. |
| M05 | EC-R02 | Change the HSD quantity from one to two. Compare the cart and checkout totals. | Both views agree on the $24.00 subtotal, $5.00 shipping, and $29.00 total. |
| M06 | EC-R02 | Remove the last item from the cart. | The empty state appears, the previous total is cleared, and checkout is unavailable. |
| M07 | EC-R01 | Add one HSD, then try to change the quantity to six. | A stock error appears. The previous quantity and totals stay intact. |
| M08 | EC-R02, EC-R04 | Start guest checkout for two HSD and simulate approval. | One paid order with a reference and a $29.00 total appears. HSD stock goes from 5 to 3. |
| M09 | EC-R04 | Start guest checkout for two HSD and simulate decline. | The shopper sees the decline and can return to the unchanged cart. No paid order exists and HSD stock remains 5. |
| M10 | EC-R04 | Start guest checkout for two HSD and cancel at the simulator. | Cancellation is visible. The cart is reusable, no paid order exists, and HSD stock remains 5. |
| M11 | EC-R03 | Start with five HSD in stock and two in the cart. Simulate accepted payment with interrupted confirmation, then retry the same attempt. | The shopper sees a paid confirmation. The attempt resolves to exactly one paid order and one reference. HSD stock ends at 3 after one deduction. |
| M12 | EC-R03, EC-R05 | Interrupt confirmation after acceptance, then refresh before retrying. Retry from the refreshed page. | The same attempt can be recovered. The shopper sees the final paid state and the same order reference. No duplicate order or deduction occurs. |
| M13 | EC-R05 | Complete the guest checkout flow with keyboard only. Trigger a decline and navigate to the recovery action. | Controls are reachable in logical order, focus is visible, and the shopper can identify the result and reach recovery by keyboard. |
| M14 | EC-R05 | At a 360 px viewport, interrupt confirmation and follow the retry path. | The pending message, retry control, and final confirmation remain readable and operable without horizontal scrolling. |

For M08–M12, pair the shopper-visible result with test-environment order and inventory evidence when available. A UI confirmation alone cannot establish that there was exactly one paid order or one stock deduction.
