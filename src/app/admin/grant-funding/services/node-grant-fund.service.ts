import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../../../../services/service';

export interface IScoreVote {
  judge: string;
  score: number;
}

export interface IScoreReportEntry {
  id: number;
  companyName: string;
  directorName: string | null;
  industryName: string | null;
  votes: IScoreVote[];
  totalScore: number;
}

@Injectable({ providedIn: 'root' })
export class NodeGrantFundService {
  private readonly base = `${Constants.ApiBase}/api-nodes/node-grand-fund`;

  constructor(private http: HttpClient) {}

  getScoreReport(): Observable<IScoreReportEntry[]> {
    return this.http.get<IScoreReportEntry[]>(`${this.base}/score-report.php`);
  }
}
