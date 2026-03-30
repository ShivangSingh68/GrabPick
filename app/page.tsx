"use client"
//TODO:
// HomePage()
// handleCreateClick()
// handleJoinClick()
import { Button } from "@base-ui/react";
import { FormEvent, useState } from "react";
import { main, deleteEvent, deleteImg, getImages } from "./api/home/route";
import Image from "next/image";
type aplha = {
  key: string,
  url: string,
}
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<aplha[]>([]);
  const eventId = "123";
  const forData = new FormData();
  if(file) {
    forData.append("file", file!);
  }
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      // bucket: "grabpick-images",
      key: `event${eventId}/${file?.name}`,
    };
    main(forData, payload.key);

  }
  const DeleteBtn = async () => {
    await deleteImg(`event${eventId}/aws.webp`)
  }
  const Getbtn = async () => {
    const imgs = await getImages(eventId);
    setImages(imgs);
  }
  const DeleteEventBtn = () => {
    deleteEvent(`event${eventId}`);
  }
  return (
  <>
    <h1>Hello</h1>
    <form action="#">
      <input type="file" name="" id="" onChange={(e) => setFile(e.target.files![0])}/>
      <Button className="bg-blue-700 text-white" type="submit" onClick={(e) => handleSubmit(e)}>Submit</Button>
    </form>
    <Button className="w-xl bg-red-700 text-white" onClick={DeleteBtn}>Delete Image</Button>
    <Button className="bg-yellow-600 text-white" onClick= {Getbtn}>Get All Images</Button>
    <Button className="w-xl bg-red-700 text-white" onClick={DeleteEventBtn}>Delete Event</Button>
    {images.map((img) => {
  return <img src={img.url} key={img.url} height="100px" width="100px"/>;
})}
  </>
  );
}
