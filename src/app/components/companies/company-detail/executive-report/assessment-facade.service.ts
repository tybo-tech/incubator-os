// assessment-facade.service.ts
import { Injectable } from '@angular/core';
import { QuestionnaireService } from '../../../../../services/questionnaire.service';
import { Observable, of } from 'rxjs';
import { switchMap, shareReplay } from 'rxjs/operators';
import { BusinessQuestionnaire } from '../../../../../models/questionnaire.models';

type ResponsesMap = { [questionId: string]: any };

@Injectable({ providedIn: 'root' })
export class AssessmentFacade {
  private questionnaireCache$?: Observable<BusinessQuestionnaire>;

  constructor(private qs: QuestionnaireService) {}

  getQuestionnaire(): Observable<BusinessQuestionnaire> {
    if (!this.questionnaireCache$) {
      this.questionnaireCache$ = this.qs.getBusinessAssessmentQuestionnaire().pipe(shareReplay(1));
    }
    return this.questionnaireCache$;
  }

  getResponses(companyId: number): Observable<ResponsesMap> {
    // For now, return empty responses - you can implement proper data loading later
    return of({}).pipe(shareReplay(1));
  }
}
