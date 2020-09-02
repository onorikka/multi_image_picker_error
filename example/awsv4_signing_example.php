
<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Carbon\Carbon;
use Validator;

/*
This code is based on Laravel, it can be adopted to any PHP platform
just make sure that you sign in the same exact order in the same exact way
otherwise the signature will be wrong
*/


class EvaporateJSController extends Controller
{
  /**
   * Generates AWS S3 signature to allow EvaporateJS to upload directly to S3
   * @param  Request ['to_sign', 'datetime']
   * @return response json signature
   */
  public function getS3Signature(Request $request)
  {
      // make sure you are getting the correct values from EvaporateJS, otherwise stop
      $validationRules =  [
        'to_sign' => ['bail','required'],
        'datetime' => ['bail','required'],
      ];

      $validation = Validator::make($request->all(), $validationRules);
      if ($validation->fails()) {
          //let's just return plain text
          return response($validation->errors()->first(), 422);
          // $response = ["success"=>false, "message"=>['errors'=>$validation->errors()->all()]];
          // return response()->json($response);
      }

      //the data is correct here use them
      $to_sign = $request->get('to_sign');
      $dateTime = $request->get('datetime');

      //format the datetime to the correct format AWS expect
      $formattedDate = Carbon::parse($dateTime)->format('Ymd');
