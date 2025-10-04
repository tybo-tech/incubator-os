import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { IndustryService, CreateIndustryRequest, UpdateIndustryRequest } from './industry.service';
import { Constants } from './service';

describe('IndustryService', () => {
  let service: IndustryService;
  let httpMock: HttpTestingController;
  const apiUrl = `${Constants.ApiBase}/api-nodes/industry`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [IndustryService]
    });
    service = TestBed.inject(IndustryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Parameter Validation', () => {
    it('should reject empty industry name in addIndustry', (done) => {
      const invalidData: CreateIndustryRequest = { name: '' };

      service.addIndustry(invalidData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Industry name is required');
          done();
        }
      });
    });

    it('should reject invalid ID in updateIndustry', (done) => {
      const updateData: UpdateIndustryRequest = { name: 'Test' };

      service.updateIndustry(0, updateData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Valid industry ID is required for update');
          done();
        }
      });
    });

    it('should reject empty update data', (done) => {
      service.updateIndustry(1, {}).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('At least one field must be provided for update');
          done();
        }
      });
    });

    it('should reject invalid search term', (done) => {
      service.searchIndustries('').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Search term is required');
          done();
        }
      });
    });
  });

  describe('HTTP Method Enforcement', () => {
    it('should use POST for addIndustry', () => {
      const industryData: CreateIndustryRequest = { name: 'Test Industry' };

      service.addIndustry(industryData).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/add-industry.php`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: 'Test Industry' });
    });

    it('should use PUT for updateIndustry with ID in query param', () => {
      const updateData: UpdateIndustryRequest = { name: 'Updated Industry' };

      service.updateIndustry(123, updateData).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/update-industry.php?id=123`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ name: 'Updated Industry' });
    });

    it('should use GET for getIndustryById', () => {
      service.getIndustryById(123).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/get-industry.php?id=123`);
      expect(req.request.method).toBe('GET');
    });
  });

  describe('Parameter Sanitization', () => {
    it('should trim industry name in addIndustry', () => {
      const industryData: CreateIndustryRequest = { name: '  Test Industry  ' };

      service.addIndustry(industryData).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/add-industry.php`);
      expect(req.request.body.name).toBe('Test Industry');
    });

    it('should validate and sanitize list parameters', () => {
      service.listIndustries({
        page: -1, // Should be corrected to 1
        limit: 2000, // Should be capped at 1000
        search: '  tech  ', // Should be trimmed
        order_by: 'invalid_field' as any // Should be ignored
      }).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url.includes('/list-industries.php') &&
               request.params.get('page') === '1' &&
               request.params.get('limit') === '1000' &&
               request.params.get('search') === 'tech' &&
               !request.params.has('order_by');
      });
      expect(req.request.method).toBe('GET');
    });
  });

  describe('Backward Compatibility', () => {
    it('should support old addIndustry signature', () => {
      service.addIndustry('Test Industry', 123, { description: 'Test' }).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/add-industry.php`);
      expect(req.request.body).toEqual({
        name: 'Test Industry',
        parent_id: 123,
        description: 'Test'
      });
    });
  });
});
