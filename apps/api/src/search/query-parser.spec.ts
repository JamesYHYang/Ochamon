import {
  parseSearchQuery,
  hasConstraints,
  summarizeParsedQuery,
} from './query-parser';

describe('Query Parser', () => {
  describe('parseSearchQuery', () => {
    describe('Region extraction', () => {
      it('should extract Uji region from query', () => {
        const result = parseSearchQuery('organic uji matcha');
        expect(result.regions).toContain('Uji, Kyoto');
      });

      it('should extract Nishio region from query', () => {
        const result = parseSearchQuery('nishio culinary grade');
        expect(result.regions).toContain('Nishio, Aichi');
      });

      it('should extract Yame region (Fukuoka) from query', () => {
        const result = parseSearchQuery('premium yame ceremonial');
        expect(result.regions).toContain('Fukuoka');
      });

      it('should extract Kagoshima region from query', () => {
        const result = parseSearchQuery('kagoshima matcha');
        expect(result.regions).toContain('Kagoshima');
      });

      it('should extract multiple regions from query', () => {
        const result = parseSearchQuery('uji or nishio matcha');
        expect(result.regions).toHaveLength(2);
        expect(result.regions).toContain('Uji, Kyoto');
        expect(result.regions).toContain('Nishio, Aichi');
      });
    });

    describe('Grade extraction', () => {
      it('should extract ceremonial grade', () => {
        const result = parseSearchQuery('ceremonial grade matcha');
        expect(result.grades).toContain('CEREMONIAL');
      });

      it('should extract premium grade', () => {
        const result = parseSearchQuery('premium matcha for drinking');
        expect(result.grades).toContain('PREMIUM');
      });

      it('should extract cafe grade', () => {
        const result = parseSearchQuery('cafe grade for lattes');
        expect(result.grades).toContain('CAFE');
      });

      it('should extract barista as cafe grade', () => {
        const result = parseSearchQuery('barista blend matcha');
        expect(result.grades).toContain('CAFE');
      });

      it('should extract culinary grade', () => {
        const result = parseSearchQuery('culinary matcha for baking');
        expect(result.grades).toContain('CULINARY_A');
      });

      it('should extract industrial grade', () => {
        const result = parseSearchQuery('industrial grade for extracts');
        expect(result.grades).toContain('INDUSTRIAL');
      });
    });

    describe('Certification extraction', () => {
      it('should extract organic certification', () => {
        const result = parseSearchQuery('organic uji ceremonial');
        expect(result.certifications).toContain('organic');
      });

      it('should extract JAS certification', () => {
        const result = parseSearchQuery('JAS certified matcha');
        expect(result.certifications).toContain('JAS Organic');
      });

      it('should extract USDA organic certification', () => {
        const result = parseSearchQuery('USDA organic premium');
        expect(result.certifications).toContain('USDA Organic');
      });

      it('should extract EU organic certification', () => {
        const result = parseSearchQuery('EU organic certified');
        expect(result.certifications).toContain('EU Organic');
      });

      it('should extract fair trade certification', () => {
        const result = parseSearchQuery('fair-trade matcha');
        expect(result.certifications).toContain('Fair Trade');
      });

      it('should extract multiple certifications', () => {
        const result = parseSearchQuery('organic JAS certified USDA');
        expect(result.certifications).toHaveLength(3);
      });
    });

    describe('MOQ extraction', () => {
      it('should extract MOQ max from "moq <20kg"', () => {
        const result = parseSearchQuery('organic uji moq <20kg');
        expect(result.moqMax).toBe(20);
      });

      it('should extract MOQ max from "moq under 50kg"', () => {
        const result = parseSearchQuery('premium moq under 50kg');
        expect(result.moqMax).toBe(50);
      });

      it('should extract MOQ from "minimum 5kg"', () => {
        const result = parseSearchQuery('ceremonial minimum 5kg');
        expect(result.moqMax).toBe(5);
      });

      it('should extract MOQ from "under 20kg moq"', () => {
        const result = parseSearchQuery('organic under 20kg');
        expect(result.moqMax).toBe(20);
      });

      it('should extract MOQ from "less than 30 kg"', () => {
        const result = parseSearchQuery('less than 30 kg culinary');
        expect(result.moqMax).toBe(30);
      });
    });

    describe('Lead time extraction', () => {
      it('should extract lead time from "ship in 7 days"', () => {
        const result = parseSearchQuery('ceremonial ship in 7 days');
        expect(result.leadTimeMax).toBe(7);
      });

      it('should extract lead time from "2 week lead"', () => {
        const result = parseSearchQuery('premium 2 week lead time');
        expect(result.leadTimeMax).toBe(14);
      });

      it('should extract lead time from "lead time 14 days"', () => {
        const result = parseSearchQuery('organic lead time 14 days');
        expect(result.leadTimeMax).toBe(14);
      });

      it('should extract lead time from "7 day delivery"', () => {
        const result = parseSearchQuery('uji 7 day delivery');
        expect(result.leadTimeMax).toBe(7);
      });
    });

    describe('Price extraction', () => {
      it('should extract max price from "under $100"', () => {
        const result = parseSearchQuery('ceremonial under $100');
        expect(result.priceMax).toBe(100);
      });

      it('should extract max price from "budget $50"', () => {
        const result = parseSearchQuery('culinary budget $50');
        expect(result.priceMax).toBe(50);
      });

      it('should extract price range from "$50-$100"', () => {
        const result = parseSearchQuery('premium $50-$100');
        expect(result.priceMin).toBe(50);
        expect(result.priceMax).toBe(100);
      });

      it('should extract approximate price from "around $80"', () => {
        const result = parseSearchQuery('cafe grade around $80');
        expect(result.priceMin).toBeCloseTo(64, 0); // 80 * 0.8
        expect(result.priceMax).toBeCloseTo(96, 0); // 80 * 1.2
      });
    });

    describe('Destination country extraction', () => {
      it('should extract USA from "ship to usa"', () => {
        const result = parseSearchQuery('organic ship to usa');
        expect(result.destinationCountry).toBe('US');
      });

      it('should extract Singapore from "ship to singapore"', () => {
        const result = parseSearchQuery('ceremonial ship to singapore');
        expect(result.destinationCountry).toBe('SG');
      });

      it('should extract UK from "deliver to uk"', () => {
        const result = parseSearchQuery('premium deliver to uk');
        expect(result.destinationCountry).toBe('GB');
      });

      it('should extract EU from "shipping to europe"', () => {
        const result = parseSearchQuery('organic shipping to europe');
        expect(result.destinationCountry).toBe('EU');
      });
    });

    describe('Complex query parsing', () => {
      it('should parse "organic uji ceremonial moq <20kg ship to singapore"', () => {
        const result = parseSearchQuery(
          'organic uji ceremonial moq <20kg ship to singapore',
        );

        expect(result.certifications).toContain('organic');
        expect(result.regions).toContain('Uji, Kyoto');
        expect(result.grades).toContain('CEREMONIAL');
        expect(result.moqMax).toBe(20);
        expect(result.destinationCountry).toBe('SG');
      });

      it('should parse "premium matcha for cafe use 2 week lead under $60"', () => {
        const result = parseSearchQuery(
          'premium matcha for cafe use 2 week lead under $60',
        );

        expect(result.grades).toContain('PREMIUM');
        expect(result.grades).toContain('CAFE'); // "cafe" is also detected
        expect(result.leadTimeMax).toBe(14);
        expect(result.priceMax).toBe(60);
      });

      it('should parse "JAS certified culinary grade nishio minimum 50kg"', () => {
        const result = parseSearchQuery(
          'JAS certified culinary grade nishio minimum 50kg',
        );

        expect(result.certifications).toContain('JAS Organic');
        expect(result.grades).toContain('CULINARY_A');
        expect(result.regions).toContain('Nishio, Aichi');
        expect(result.moqMax).toBe(50);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty query', () => {
        const result = parseSearchQuery('');
        expect(result.keywords).toHaveLength(0);
        expect(result.regions).toHaveLength(0);
        expect(result.grades).toHaveLength(0);
      });

      it('should handle query with only stop words', () => {
        const result = parseSearchQuery('the and or is');
        expect(result.keywords).toHaveLength(0);
      });

      it('should extract keywords that are not matched to other fields', () => {
        const result = parseSearchQuery('matcha green powder');
        expect(result.keywords).toContain('matcha');
        expect(result.keywords).toContain('green');
        expect(result.keywords).toContain('powder');
      });

      it('should handle mixed case queries', () => {
        const result = parseSearchQuery('ORGANIC UJI CEREMONIAL');
        expect(result.certifications).toContain('organic');
        expect(result.regions).toContain('Uji, Kyoto');
        expect(result.grades).toContain('CEREMONIAL');
      });

      it('should not duplicate regions or grades', () => {
        const result = parseSearchQuery('uji kyoto uji matcha');
        expect(result.regions).toHaveLength(1);
      });
    });
  });

  describe('hasConstraints', () => {
    it('should return false for empty parsed query', () => {
      const parsed = parseSearchQuery('');
      expect(hasConstraints(parsed)).toBe(false);
    });

    it('should return true when keywords exist', () => {
      const parsed = parseSearchQuery('matcha');
      expect(hasConstraints(parsed)).toBe(true);
    });

    it('should return true when regions exist', () => {
      const parsed = parseSearchQuery('uji');
      expect(hasConstraints(parsed)).toBe(true);
    });

    it('should return true when MOQ is set', () => {
      const parsed = parseSearchQuery('moq <20');
      expect(hasConstraints(parsed)).toBe(true);
    });
  });

  describe('summarizeParsedQuery', () => {
    it('should summarize a complex query', () => {
      const parsed = parseSearchQuery('organic uji ceremonial moq <20kg');
      const summary = summarizeParsedQuery(parsed);

      expect(summary).toContain('Uji, Kyoto');
      expect(summary).toContain('CEREMONIAL');
      expect(summary).toContain('organic');
      expect(summary).toContain('20kg');
    });

    it('should return "no constraints" for empty query', () => {
      const parsed = parseSearchQuery('');
      const summary = summarizeParsedQuery(parsed);
      expect(summary).toBe('no constraints');
    });
  });
});
