import 'aws-lambda';
declare module 'aws-lambda' {
  interface Context {
    requestId?: string;
  }
}


