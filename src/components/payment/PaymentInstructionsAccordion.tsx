import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface PaymentInstructionsAccordionProps {
  instructions: any;
  className?: string;
}

export function PaymentInstructionsAccordion({
  instructions,
  className = "",
}: PaymentInstructionsAccordionProps) {
  if (!instructions || !Array.isArray(instructions.sections)) {
    // fallback agar tidak error
    return (
      <div className={`text-sm text-gray-500 italic ${className}`}>
        No payment instructions available for this method.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className={`space-y-2 ${className}`}>
      {instructions.sections.map((section: any, index: number) => (
        <AccordionItem
          key={index}
          value={`item-${index}`}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <AccordionTrigger className="text-sm font-semibold text-[#0A2A66] hover:bg-[#F3F6FF] px-3 py-2">
            {section.title}
          </AccordionTrigger>
          <AccordionContent className="px-4 py-3 bg-white text-gray-700 leading-relaxed">
            {Array.isArray(section.steps) ? (
              <ul className="list-decimal pl-5 space-y-1">
                {section.steps.map((step: string, i: number) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            ) : (
              <p>{section.steps || "No steps available."}</p>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
